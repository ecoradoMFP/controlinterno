// Importa una matriz de carga de SCIDAI (la que genera scripts/generar-matriz-carga.mjs) a la base
// LOCAL de Supabase. Es estricto: un CAI solo se carga si está COMPLETO (todo lo obligatorio, sin
// contradicciones); los demás se reportan con la hoja, fila y columna exactas de lo que falta.
//
// Uso:
//   node scripts/importar-matriz-scidai.mjs "Matriz.xlsx" --simular     # solo revisa y reporta
//   node scripts/importar-matriz-scidai.mjs "Matriz.xlsx"               # carga los CAI completos
//
// Personas: se buscan por nombre en el directorio (tolera tildes, mayúsculas y errores de una letra).
// Quien no aparezca se crea como EXFUNCIONARIO inactivo (ya no forma parte de la DAI), sin acceso.

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import { DEPARTAMENTOS, ESTADOS, FILA_ENCABEZADO, HOJAS, PRIMERA_FILA_DATOS, TIPOS_DOCUMENTO } from "./lib/matriz-scidai.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const archivo = args.find((a) => !a.startsWith("--"));
const SIMULAR = args.includes("--simular");
if (!archivo) throw new Error('Uso: node scripts/importar-matriz-scidai.mjs "Matriz.xlsx" [--simular]');

function cargarEnv(f) {
  const env = {};
  for (const l of readFileSync(path.join(ROOT, f), "utf8").split("\n")) {
    const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
const env = cargarEnv(".env.development.local");
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL;
if (!URL_SB || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.development.local");
if (!URL_SB.includes("127.0.0.1") && !URL_SB.includes("localhost")) throw new Error(`Este script solo corre contra la instancia LOCAL. URL detectada: ${URL_SB}`);
const sb = createClient(URL_SB, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const ok = (r, que) => {
  if (r.error) throw new Error(`${que}: ${r.error.message}`);
  return r.data;
};

// ───────── lectura ─────────
const sinTildes = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (t) => sinTildes(t).toLowerCase().replace(/\s+/g, " ").trim();
const tit = (n) => String(n).trim().replace(/\s+/g, " ");

function valor(celda, tipo) {
  let v = celda.value;
  if (v && typeof v === "object" && "result" in v) v = v.result;
  if (v && typeof v === "object" && "richText" in v) v = v.richText.map((x) => x.text).join("");
  if (v === null || v === undefined || v === "") return null;
  if (tipo === "fecha") {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return { invalido: String(v) };
  }
  if (tipo === "entero") {
    const n = Number(v);
    return Number.isInteger(n) ? n : { invalido: String(v) };
  }
  return String(v).replace(/\r/g, "").trim() || null;
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(archivo);
const datos = {};
for (const [id, def] of Object.entries(HOJAS)) {
  const ws = wb.getWorksheet(def.nombre);
  if (!ws) throw new Error(`La matriz no tiene la hoja "${def.nombre}".`);
  const porEncabezado = new Map();
  ws.getRow(FILA_ENCABEZADO).eachCell((c, n) => porEncabezado.set(String(c.value ?? "").replace(/\s*\*$/, "").trim(), n));
  const filas = [];
  ws.eachRow((fila, nFila) => {
    if (nFila < PRIMERA_FILA_DATOS) return;
    const o = { _fila: nFila };
    let alguno = false;
    for (const c of def.columnas) {
      const n = porEncabezado.get(c.h);
      if (!n) throw new Error(`En la hoja "${def.nombre}" falta la columna "${c.h}" (¿se usó otra versión de la matriz?).`);
      o[c.k] = valor(fila.getCell(n), c.tipo);
      if (c.req !== "no" && o[c.k] !== null) alguno = true;
    }
    if (alguno) filas.push(o);
  });
  datos[id] = filas;
}

// ───────── validación ─────────
const errores = new Map(); // clave CAI -> [mensajes]
const avisos = new Map();
const err = (clave, hoja, fila, columna, msg) => {
  if (!errores.has(clave)) errores.set(clave, []);
  errores.get(clave).push(`${hoja}, fila ${fila}${columna ? ` (${columna})` : ""}: ${msg}`);
};
const aviso = (clave, msg) => {
  if (!avisos.has(clave)) avisos.set(clave, []);
  avisos.get(clave).push(msg);
};
const colDe = (id, k) => HOJAS[id].columnas.find((c) => c.k === k);
function campos(id, fila, clave) {
  for (const c of HOJAS[id].columnas) {
    const v = fila[c.k];
    if (v && typeof v === "object" && v.invalido !== undefined) err(clave, HOJAS[id].nombre, fila._fila, c.h, `valor no válido "${v.invalido}"`);
    else if (c.req === "obl" && v === null) err(clave, HOJAS[id].nombre, fila._fila, c.h, "obligatorio y vacío");
  }
}

const cais = new Map();
for (const f of datos.CAI) {
  const cai = f.cai !== null && /^\d+$/.test(f.cai) ? f.cai.padStart(5, "0") : f.cai;
  f.cai = cai;
  const clave = `${cai ?? "sin número"}-${f.anio_cai ?? "sin año"}`;
  f._clave = clave;
  campos("CAI", f, clave);
  if (cais.has(clave)) err(clave, "CAI", f._fila, null, "el mismo CAI (número y año) está repetido");
  if (f.departamento && !DEPARTAMENTOS.includes(f.departamento)) err(clave, "CAI", f._fila, "Departamento que audita", `"${f.departamento}" no es un departamento de la lista`);
  for (const [k, h] of [["supervisor", "Supervisor"], ["coordinador", "Coordinador"], ["auditores", "Auditor(es) del equipo"], ["riesgo", "Riesgo"], ["fecha_informe_final", "Fecha del informe final"], ["periodo_inicio", "Período auditado: inicio"], ["periodo_fin", "Período auditado: fin"]]) {
    if (f[k] === null) aviso(clave, `Falta "${h}" (recomendado).`);
  }
  if (f.periodo_inicio && f.periodo_fin && f.periodo_fin < f.periodo_inicio) err(clave, "CAI", f._fila, "Período auditado", "el fin es anterior al inicio");
  cais.set(clave, { ...f, defs: new Map(), segs: [] });
}
// Un CAI al que le falta el año se sigue encontrando por su número, para reportarlo completo.
const alias = new Map();
for (const [clave, c] of cais) if (c.cai && c.anio_cai === null) { alias.set(`${c.cai}-`, clave); alias.set(c.cai, clave); }
const buscarCai = (k) => (cais.has(k) ? k : alias.get(k) ?? null);

const claveDe = (f) => (f.cai_clave ?? "").trim();
for (const f of datos.DEF) {
  const claveCruda = claveDe(f) || "sin CAI";
  const clave = buscarCai(claveCruda) ?? claveCruda;
  campos("DEF", f, clave);
  const cai = cais.get(clave);
  if (!cai) {
    err(clave, "Deficiencias", f._fila, "CAI", `"${clave}" no coincide con ningún CAI completo de la hoja CAI (revisa número y año)`);
    continue;
  }
  if (cai.defs.has(f.no_deficiencia)) err(clave, "Deficiencias", f._fila, "No. de deficiencia", `la deficiencia ${f.no_deficiencia} está repetida (cada deficiencia lleva UNA recomendación)`);
  if (f.descripcion === null) aviso(clave, `Deficiencia ${f.no_deficiencia}: falta la descripción (recomendado).`);
  if (f.responsables === null) aviso(clave, `Deficiencia ${f.no_deficiencia}: faltan los responsables de implementarla (recomendado).`);
  if (cai.fecha_informe_final && f.fecha_implementacion && f.fecha_implementacion < cai.fecha_informe_final) {
    aviso(clave, `Deficiencia ${f.no_deficiencia}: la fecha de implementación (${f.fecha_implementacion}) es anterior al informe final (${cai.fecha_informe_final}).`);
  }
  cai.defs.set(f.no_deficiencia, { ...f, segs: [] });
}
for (const [clave, cai] of cais) {
  if (cai.defs.size === 0) err(clave, "Deficiencias", null, null, "el CAI no tiene ninguna deficiencia");
}

for (const f of datos.SEG) {
  const claveCruda = claveDe(f) || "sin CAI";
  const clave = buscarCai(claveCruda) ?? claveCruda;
  campos("SEG", f, clave);
  const cai = cais.get(clave);
  if (!cai) {
    err(clave, "Seguimientos", f._fila, "CAI", `"${clave}" no coincide con ningún CAI de la hoja CAI`);
    continue;
  }
  const def = cai.defs.get(f.no_deficiencia);
  if (!def) {
    err(clave, "Seguimientos", f._fila, "No. de deficiencia", `la deficiencia ${f.no_deficiencia} no existe en la hoja Deficiencias`);
    continue;
  }
  if (f.tipo_documento && !TIPOS_DOCUMENTO.includes(f.tipo_documento)) err(clave, "Seguimientos", f._fila, "Tipo de documento", `"${f.tipo_documento}" no es de la lista`);
  if (f.estado && !ESTADOS.includes(f.estado)) err(clave, "Seguimientos", f._fila, "Estado de la recomendación", `"${f.estado}" no es de la lista`);
  if (f.tipo_documento === "Nombramiento e informe") {
    if (f.no_nombramiento === null) err(clave, "Seguimientos", f._fila, "No. de nombramiento de seguimiento", "obligatorio cuando el documento es Nombramiento e informe");
    if (f.fecha_nombramiento === null) err(clave, "Seguimientos", f._fila, "Fecha del nombramiento de seguimiento", "obligatoria cuando el documento es Nombramiento e informe");
  }
  def.segs.push(f);
  cai.segs.push(f);
}
// Coherencia de seguimientos
for (const [clave, cai] of cais) {
  for (const def of cai.defs.values()) {
    const ord = [...def.segs].sort((a, b) => a.no_seguimiento - b.no_seguimiento);
    ord.forEach((s, i) => {
      if (s.no_seguimiento !== i + 1) err(clave, "Seguimientos", s._fila, "No. de seguimiento", `la deficiencia ${def.no_deficiencia} debe numerar sus seguimientos 1, 2, 3… sin saltos`);
      if (i > 0 && ord[i - 1].estado === "Cumplida") err(clave, "Seguimientos", s._fila, "Estado de la recomendación", `la deficiencia ${def.no_deficiencia} ya estaba Cumplida: no admite más seguimientos`);
    });
  }
  // Un documento (CAI + No. de seguimiento) debe ser el mismo en todas sus filas.
  const docs = new Map();
  for (const s of cai.segs) {
    const k = s.no_seguimiento;
    if (!docs.has(k)) docs.set(k, []);
    docs.get(k).push(s);
  }
  for (const [k, filas] of docs) {
    for (const campo of ["tipo_documento", "no_nombramiento", "fecha_nombramiento", "no_documento", "fecha_documento", "auditores"]) {
      const valores = new Set(filas.map((s) => JSON.stringify(s[campo])));
      if (valores.size > 1) err(clave, "Seguimientos", filas[0]._fila, colDe("SEG", campo).h, `el seguimiento ${k} tiene valores distintos en este campo entre sus filas`);
    }
  }
}

// ───────── personas ─────────
const usuarios = ok(await sb.from("usuarios").select("nit, nombre, activo, cargo"), "usuarios");
const tokens = (n) => norm(n).split(" ").filter((t) => t && !["de", "del", "la", "los", "y"].includes(t));
function lev1(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 5) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i);
}
const tokEq = (a, b) => a === b || lev1(a, b);
function buscarPersona(nombre) {
  const A = tokens(nombre);
  let mejor = [];
  let puntaje = 0;
  for (const u of usuarios) {
    const B = tokens(u.nombre);
    const comunes = A.filter((a) => B.some((b) => tokEq(a, b))).length;
    const cobertura = comunes / Math.min(A.length, B.length);
    if (comunes >= 2 && cobertura >= 0.75) {
      if (comunes > puntaje) { puntaje = comunes; mejor = [u]; }
      else if (comunes === puntaje) mejor.push(u);
    }
  }
  return mejor;
}
const nombresDeCelda = (v) => (v ? v.split(/\n|;/).map(tit).filter(Boolean) : []);
const personas = new Map(); // nombre tal cual -> {nit, creado}
const aCrear = [];
let correlativoEx = usuarios.filter((u) => u.nit.startsWith("EX-")).length;
function persona(nombre, contexto) {
  if (!nombre) return null;
  if (personas.has(nombre)) return personas.get(nombre);
  const m = buscarPersona(nombre);
  let r;
  if (m.length === 1) r = { nit: m[0].nit, nota: norm(m[0].nombre) === norm(nombre) ? null : `"${nombre}" se tomó como "${m[0].nombre}"` };
  else if (m.length > 1) r = { error: `"${nombre}" coincide con varias personas del directorio (${m.map((u) => u.nombre).join(", ")}): escribe el nombre completo` };
  else {
    correlativoEx += 1;
    const nit = `EX-${String(correlativoEx).padStart(3, "0")}`;
    r = { nit, creado: true, nombre, nota: `"${nombre}" no está en el directorio: se crea como exfuncionario inactivo (${nit})` };
    aCrear.push({ nit, nombre });
    usuarios.push({ nit, nombre, activo: false, cargo: null });
  }
  personas.set(nombre, r);
  return r;
}
for (const [clave, cai] of cais) {
  const nombres = [cai.supervisor, cai.coordinador, ...nombresDeCelda(cai.auditores), ...cai.segs.flatMap((s) => nombresDeCelda(s.auditores))];
  for (const n of nombres) {
    const p = persona(n);
    if (p?.error) err(clave, "CAI/Seguimientos", null, null, p.error);
    else if (p?.nota) aviso(clave, p.nota);
  }
}

// ───────── reporte ─────────
const completos = [...cais.keys()].filter((k) => !errores.has(k));
const incompletos = [...errores.keys()];
console.log(`\nMatriz: ${archivo}`);
console.log(`CAI en la matriz: ${cais.size} · completos: ${completos.length} · con faltantes: ${incompletos.filter((k) => cais.has(k)).length}\n`);
for (const clave of new Set([...cais.keys(), ...errores.keys()])) {
  const es = errores.get(clave) ?? [];
  console.log(es.length ? `✗ CAI ${clave} — NO SE CARGA (${es.length} problema(s)):` : `✓ CAI ${clave} — completo`);
  for (const e of es) console.log(`    · ${e}`);
  for (const a of avisos.get(clave) ?? []) console.log(`    ~ ${a}`);
}
if (SIMULAR) {
  console.log("\n(modo simulación: no se escribió nada)");
  process.exit(0);
}

// ───────── carga ─────────
const director = usuarios.find((u) => u.cargo === "director")?.nit;
if (!director) throw new Error("No hay un usuario con cargo director para registrar la carga.");
const departamentos = ok(await sb.from("departamentos").select("id, nombre"), "departamentos");
const depId = (n) => departamentos.find((d) => d.nombre === n).id;
const existentes = ok(await sb.from("informes_auditoria").select("cai, anio_cai"), "informes existentes");
const yaEstan = new Set(existentes.map((i) => `${i.cai}-${i.anio_cai}`));
const ESTADO_DB = { Cumplida: "cumplida", "No cumplida": "no_cumplida", "En proceso": "en_proceso", Pendiente: "pendiente" };

for (const a of aCrear) {
  ok(await sb.from("usuarios").insert({
    nit: a.nit, auth_user_id: null, nombre: a.nombre,
    puesto: "Exfuncionario (ya no forma parte de la DAI)",
    correo: `${sinTildes(a.nombre).toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")}@exfuncionarios.scidai.test`,
    departamento_id: null, cargo: null, permiso_sistema: "consulta", activo: false,
  }), `exfuncionario ${a.nombre}`);
}
const nitDe = (n) => personas.get(n)?.nit ?? null;

let cargados = 0;
for (const clave of completos) {
  const c = cais.get(clave);
  if (yaEstan.has(clave)) {
    console.log(`= CAI ${clave}: ya existe en la base, no se vuelve a cargar.`);
    continue;
  }
  const informeId = randomUUID();
  ok(await sb.from("informes_auditoria").insert({
    id: informeId, cai: c.cai, anio_cai: c.anio_cai, no_nombramiento: c.no_nombramiento, departamento_id: depId(c.departamento),
    dependencia_auditada: c.dependencia, tipo_auditoria: c.tipo_auditoria, fecha_nombramiento: c.fecha_nombramiento,
    periodo_auditado_inicio: c.periodo_inicio, periodo_auditado_fin: c.periodo_fin, fecha_informe_final: c.fecha_informe_final,
    fecha_notificacion: c.fecha_notificacion, supervisor_nit: nitDe(c.supervisor), coordinador_nit: nitDe(c.coordinador),
    riesgo: c.riesgo, creado_por_nit: director,
  }), `informe ${clave}`);
  const equipo = [...new Set(nombresDeCelda(c.auditores).map(nitDe))];
  if (equipo.length) ok(await sb.from("informes_auditoria_equipo").insert(equipo.map((nit) => ({ informe_id: informeId, usuario_nit: nit }))), `equipo ${clave}`);

  const recId = new Map();
  for (const d of [...c.defs.values()].sort((a, b) => a.no_deficiencia - b.no_deficiencia)) {
    const defId = randomUUID();
    ok(await sb.from("deficiencias").insert({ id: defId, informe_id: informeId, numero: d.no_deficiencia, titulo: d.titulo, descripcion: d.descripcion, creado_por_nit: director }), `deficiencia ${d.no_deficiencia} de ${clave}`);
    const rid = randomUUID();
    ok(await sb.from("recomendaciones").insert({ id: rid, deficiencia_id: defId, numero: 1, texto: d.recomendacion, responsables: d.responsables, fecha_implementacion: d.fecha_implementacion, creado_por_nit: director }), `recomendación de la deficiencia ${d.no_deficiencia} de ${clave}`);
    recId.set(d.no_deficiencia, rid);
  }

  const porSeg = new Map();
  for (const s of c.segs) {
    if (!porSeg.has(s.no_seguimiento)) porSeg.set(s.no_seguimiento, []);
    porSeg.get(s.no_seguimiento).push(s);
  }
  for (const k of [...porSeg.keys()].sort((a, b) => a - b)) {
    const filas = porSeg.get(k);
    const f0 = filas[0];
    const docId = randomUUID();
    const esOficio = f0.tipo_documento === "Oficio";
    ok(await sb.from("documentos_seguimiento").insert({
      id: docId, departamento_id: depId(c.departamento), tipo_documento: esOficio ? "oficio" : "informe",
      no_nombramiento: esOficio ? null : f0.no_nombramiento, fecha_nombramiento: esOficio ? null : f0.fecha_nombramiento,
      no_documento: f0.no_documento, fecha_documento: f0.fecha_documento, fecha_carga_sag_udai: f0.fecha_sag, creado_por_nit: director,
    }), `documento ${f0.no_documento}`);
    ok(await sb.from("documentos_seguimiento_informes").insert({ documento_id: docId, informe_id: informeId }), "cobertura del documento");
    const aud = [...new Set(nombresDeCelda(f0.auditores).map(nitDe))];
    if (aud.length) ok(await sb.from("documentos_seguimiento_auditores").insert(aud.map((nit) => ({ documento_id: docId, usuario_nit: nit }))), "auditores del documento");
    for (const s of filas) {
      ok(await sb.from("seguimientos_recomendacion").insert({
        recomendacion_id: recId.get(s.no_deficiencia), documento_id: docId, numero_seguimiento: 1,
        estado: ESTADO_DB[s.estado], acciones_responsables: s.acciones, comentario_auditoria: s.comentario, registrado_por_nit: director,
      }), `seguimiento ${k} de la deficiencia ${s.no_deficiencia} de ${clave}`);
    }
  }
  cargados += 1;
  console.log(`+ CAI ${clave} cargado (${c.defs.size} deficiencias, ${porSeg.size} seguimiento(s)).`);
}
console.log(`\nListo: ${cargados} CAI cargado(s); ${aCrear.length} exfuncionario(s) creado(s).`);
