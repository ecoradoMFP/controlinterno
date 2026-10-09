// Importa una matriz de carga de SCIDAI (la que genera scripts/generar-matriz-carga.mjs, UNA hoja
// por etapas) a la base LOCAL de Supabase. Es estricto: un CAI solo se carga si está COMPLETO (todo
// lo obligatorio, sin contradicciones); los demás se reportan con la fila y columna exactas de lo
// que falta.
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
import {
  COLUMNAS, DEPARTAMENTOS, ESTADOS, FILA_ENCABEZADO, NOMBRE_HOJA, NUM_SEGUIMIENTOS, PRIMERA_FILA_DATOS, TIPOS_DOCUMENTO,
} from "./lib/matriz-scidai.mjs";

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
const sinTildes = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
const ws = wb.getWorksheet(NOMBRE_HOJA);
if (!ws) throw new Error(`La matriz no tiene la hoja "${NOMBRE_HOJA}" (¿se usó otra versión del formato?).`);
// El formato es posicional: se verifica que los encabezados coincidan con la definición.
COLUMNAS.forEach((c, i) => {
  const h = String(ws.getCell(FILA_ENCABEZADO, i + 1).value ?? "").replace(/\s*\*$/, "").trim();
  if (h !== c.h) throw new Error(`Columna ${i + 1}: se esperaba "${c.h}" y la matriz dice "${h}" (¿se usó otra versión del formato?).`);
});
const filas = [];
ws.eachRow((fila, nFila) => {
  if (nFila < PRIMERA_FILA_DATOS) return;
  const o = { _fila: nFila };
  let alguno = false;
  COLUMNAS.forEach((c, i) => {
    o[c.k] = valor(fila.getCell(i + 1), c.tipo);
    if (c.req !== "no" && o[c.k] !== null) alguno = true;
  });
  if (alguno) filas.push(o);
});

// ───────── armado y validación ─────────
const errores = new Map(); // clave CAI -> [mensajes]
const avisos = new Map();
const err = (clave, fila, columna, msg) => {
  if (!errores.has(clave)) errores.set(clave, []);
  errores.get(clave).push(`${fila ? `fila ${fila}` : "CAI"}${columna ? ` · ${columna}` : ""}: ${msg}`);
};
const aviso = (clave, msg) => {
  if (!avisos.has(clave)) avisos.set(clave, []);
  avisos.get(clave).push(msg);
};
const etiqueta = (c) => `${c.bloque.seg ? `Seguimiento ${c.bloque.seg}` : c.bloque.id === "id" ? "Identificación" : c.bloque.id === "cai" ? "El CAI" : c.bloque.id === "def" ? "Deficiencia" : "Notas"} · ${c.h}`;
const col = (k) => COLUMNAS.find((c) => c.k === k);
const vacio = (v) => v === null || v === undefined;

// Filas contiguas con el mismo (año, CAI) forman un CAI.
const grupos = [];
for (const f of filas) {
  if (f.cai !== null && /^\d+$/.test(f.cai)) f.cai = f.cai.padStart(5, "0");
  const k = `${f.cai ?? "?"}|${f.anio_cai ?? ""}`;
  const ultimo = grupos[grupos.length - 1];
  if (ultimo && ultimo.k === k) ultimo.filas.push(f);
  else grupos.push({ k, filas: [f] });
}
const vistos = new Map();
const cais = new Map();
for (const g of grupos) {
  const f0 = g.filas[0];
  const clave = `${f0.cai ?? "sin número"}-${f0.anio_cai ?? "sin año"}`;
  if (vistos.has(g.k)) err(clave, g.filas[0]._fila, null, "las filas de este CAI no están juntas (aparece también más arriba)");
  vistos.set(g.k, true);
  const cai = { _clave: clave, cai: f0.cai, anio_cai: f0.anio_cai, defs: new Map(), segs: [], filas: g.filas };
  cais.set(clave, cai);

  // Tipos inválidos en cualquier celda del CAI
  for (const f of g.filas) {
    for (const c of COLUMNAS) {
      const v = f[c.k];
      if (v && typeof v === "object" && v.invalido !== undefined) err(clave, f._fila, etiqueta(c), `valor no válido "${v.invalido}"`);
    }
  }
  // Identificación en cada fila
  for (const k of ["anio_cai", "cai"]) {
    if (g.filas.every((f) => vacio(f[k]))) err(clave, g.filas[0]._fila, etiqueta(col(k)), "obligatorio y vacío (en todas las filas de este CAI)");
    else for (const f of g.filas) if (vacio(f[k])) err(clave, f._fila, etiqueta(col(k)), "obligatorio y vacío");
  }
  for (const f of g.filas) if (vacio(f.no_deficiencia)) err(clave, f._fila, etiqueta(col("no_deficiencia")), "obligatorio y vacío");
  // Datos del CAI y de cada documento: una vez; si se repiten deben coincidir
  const unico = (k) => {
    const valores = [...new Set(g.filas.map((f) => f[k]).filter((v) => !vacio(v) && typeof v !== "object").map(String))];
    if (valores.length > 1) err(clave, g.filas.find((f) => !vacio(f[k]) && String(f[k]) === valores[1])._fila, etiqueta(col(k)), `tiene valores distintos en las filas del mismo CAI (${valores.join(" / ")})`);
    return g.filas.map((f) => f[k]).find((v) => !vacio(v) && typeof v !== "object") ?? null;
  };
  for (const c of COLUMNAS.filter((x) => x.nivel === "cai")) {
    cai[c.k] = unico(c.k);
    if (vacio(cai[c.k]) && c.req === "obl") err(clave, g.filas[0]._fila, etiqueta(c), "obligatorio y vacío (se escribe en la primera fila del CAI)");
    else if (vacio(cai[c.k]) && c.req === "rec") aviso(clave, `Falta "${c.h}" (recomendado).`);
  }
  if (cai.departamento && !DEPARTAMENTOS.includes(cai.departamento)) err(clave, g.filas[0]._fila, etiqueta(col("departamento")), `"${cai.departamento}" no es un departamento de la lista`);
  if (cai.periodo_inicio && cai.periodo_fin && cai.periodo_fin < cai.periodo_inicio) err(clave, g.filas[0]._fila, "El CAI · Período auditado", "el fin es anterior al inicio");

  // Deficiencias (una por fila)
  for (const f of g.filas) {
    const n = f.no_deficiencia;
    for (const c of COLUMNAS.filter((x) => x.bloque.id === "def" && x.req === "obl")) if (vacio(f[c.k])) err(clave, f._fila, etiqueta(c), "obligatorio y vacío");
    if (f.descripcion === null) aviso(clave, `Deficiencia ${n}: falta la descripción (recomendado).`);
    if (f.responsables === null) aviso(clave, `Deficiencia ${n}: faltan los responsables de implementarla (recomendado).`);
    if (cai.fecha_informe_final && f.fecha_implementacion && f.fecha_implementacion < cai.fecha_informe_final) {
      aviso(clave, `Deficiencia ${n}: la fecha de implementación (${f.fecha_implementacion}) es anterior al informe final (${cai.fecha_informe_final}).`);
    }
    if (n === null) continue;
    if (cai.defs.has(n)) err(clave, f._fila, etiqueta(col("no_deficiencia")), `la deficiencia ${n} está repetida (cada deficiencia lleva UNA recomendación)`);
    cai.defs.set(n, { ...f, segs: [] });
  }

  // Seguimientos 1..N
  let previoUsado = true;
  for (let n = 1; n <= NUM_SEGUIMIENTOS; n++) {
    const cols = COLUMNAS.filter((c) => c.bloque.seg === n);
    const usado = g.filas.some((f) => cols.some((c) => !vacio(f[c.k])));
    if (!usado) { previoUsado = false; continue; }
    if (!previoUsado) err(clave, g.filas[0]._fila, `Seguimiento ${n}`, `está lleno pero el seguimiento ${n - 1} está vacío: los seguimientos van en orden`);
    previoUsado = true;
    const doc = {};
    for (const c of cols.filter((x) => x.nivel === "doc")) doc[c.k.replace(/_\d$/, "")] = unico(c.k);
    const esNombramiento = doc.tipo_documento === "Nombramiento e informe";
    if (doc.tipo_documento && !TIPOS_DOCUMENTO.includes(doc.tipo_documento)) err(clave, g.filas[0]._fila, etiqueta(col(`tipo_documento_${n}`)), `"${doc.tipo_documento}" no es de la lista`);
    for (const c of cols.filter((x) => x.nivel === "doc")) {
      const k = c.k.replace(/_\d$/, "");
      if (vacio(doc[k]) && c.req === "obl" && (!c.cond || esNombramiento)) err(clave, g.filas[0]._fila, etiqueta(c), "obligatorio y vacío (se escribe en la primera fila del CAI)");
      else if (vacio(doc[k]) && c.req === "rec" && (!c.cond || esNombramiento)) aviso(clave, `Seguimiento ${n}: falta "${c.h}" (recomendado).`);
    }
    for (const f of g.filas) {
      const def = cai.defs.get(f.no_deficiencia);
      if (!def) continue;
      const anteriorCumplida = def.segs.some((s) => s.estado === "Cumplida");
      const tiene = [`estado_${n}`, `acciones_${n}`, `comentario_${n}`].some((k) => !vacio(f[k]));
      if (anteriorCumplida) {
        if (tiene) err(clave, f._fila, `Seguimiento ${n}`, `la deficiencia ${f.no_deficiencia} ya estaba Cumplida: no admite más seguimientos`);
        continue;
      }
      if (!tiene) {
        aviso(clave, `Deficiencia ${f.no_deficiencia}: no se evaluó en el seguimiento ${n} (sigue con su estado anterior).`);
        continue;
      }
      for (const k of [`estado_${n}`, `comentario_${n}`]) if (vacio(f[k])) err(clave, f._fila, etiqueta(col(k)), "obligatorio y vacío");
      if (f[`estado_${n}`] && !ESTADOS.includes(f[`estado_${n}`])) err(clave, f._fila, etiqueta(col(`estado_${n}`)), `"${f[`estado_${n}`]}" no es de la lista`);
      const seg = { no_seguimiento: n, ...doc, estado: f[`estado_${n}`], acciones: f[`acciones_${n}`], comentario: f[`comentario_${n}`], _fila: f._fila, no_deficiencia: f.no_deficiencia };
      def.segs.push(seg);
      cai.segs.push(seg);
    }
    cai[`doc${n}`] = doc;
  }
  if (cai.defs.size === 0) err(clave, null, "Deficiencias", "el CAI no tiene ninguna deficiencia");
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
function persona(nombre) {
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
  const nombres = [cai.supervisor, cai.coordinador, ...nombresDeCelda(cai.auditores), ...cai.segs.flatMap((s) => [s.tipo_documento === "Oficio" ? null : s.coordinador, ...nombresDeCelda(s.auditores)])];
  for (const n of nombres) {
    const p = persona(n);
    if (p?.error) err(clave, null, "Personas", p.error);
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
      coordinador_nit: esOficio ? null : nitDe(f0.coordinador), fecha_limite_informe: esOficio ? null : f0.fecha_limite,
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
