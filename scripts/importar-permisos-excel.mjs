// Uso (solo local): node scripts/importar-permisos-excel.mjs datos-reales/EXTRAMUROS*.xlsx --anio=2026 [--cargar]

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const archivos = args.filter((a) => !a.startsWith("--"));
const CARGAR = args.includes("--cargar");
const ANIO = Number(args.find((a) => a.startsWith("--anio="))?.split("=")[1]);
if (!archivos.length || !ANIO) throw new Error("Uso: node scripts/importar-permisos-excel.mjs <archivos.xlsx> --anio=2026 [--cargar]");

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

const sinTildes = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (t) => sinTildes(t).toLowerCase().replace(/[.]/g, " ").replace(/\s+/g, " ").trim();
const usuarios = ok(await sb.from("usuarios").select("nit, nombre, cargo, permiso_sistema").eq("activo", true), "usuarios");
const tokens = (n) =>
  norm(n)
    .replace(/\b(mc|mac) (\w)/g, "$1$2")
    .split(" ")
    .filter((t) => t && !["de", "del", "la", "los", "y", "lic", "licda"].includes(t));
function lev1(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 5) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return (
    a.slice(i + 1) === b.slice(i + 1) ||
    a.slice(i) === b.slice(i + 1) ||
    a.slice(i + 1) === b.slice(i) ||
    (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
  );
}
const tokEq = (a, b) => a === b || lev1(a, b) || (a.length >= 5 && b.startsWith(a)) || (b.length >= 5 && a.startsWith(b));
function buscarPersona(nombre) {
  const A = tokens(nombre);
  let mejor = [];
  let puntaje = 0;
  for (const u of usuarios) {
    const B = tokens(u.nombre);
    const comunes = A.filter((a) => B.some((b) => tokEq(a, b))).length;
    if (comunes >= 2 && comunes / A.length >= 0.75) {
      if (comunes > puntaje) [puntaje, mejor] = [comunes, [u]];
      else if (comunes === puntaje) mejor.push(u);
    }
  }
  return mejor;
}

const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const RE_DIA = /^\s*(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\s+(\d{1,2})\s*\/\s*(\d{1,2})/;
const texto = (v) => (v && typeof v === "object" && "richText" in v ? v.richText.map((t) => t.text).join("") : v);
function hora(v) {
  if (v instanceof Date) return `${String(v.getUTCHours()).padStart(2, "0")}:${String(v.getUTCMinutes()).padStart(2, "0")}`;
  if (typeof v === "number") {
    const min = Math.round(v * 1440);
    return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  }
  return null;
}
const minutos = (de, a) => (de && a ? Number(a.slice(0, 2)) * 60 + Number(a.slice(3)) - (Number(de.slice(0, 2)) * 60 + Number(de.slice(3))) : 0);
function tipoDe(motivo) {
  const m = norm(motivo);
  if (m.includes("tard")) return "entrada_tardia";
  if (m.includes("marcaje")) return "nota_marcaje";
  if (m.includes("comisi") || m.includes("capacitaci")) return "comision_oficial";
  if (/igss|medic|clinic|oftalm|odont|dentist|hospital|doctor|laborator|terapia/.test(m)) return "cita_medica";
  return "asunto_personal";
}
function duracion(v) {
  v = v && typeof v === "object" && "result" in v ? v.result : v;
  if (v instanceof Date) return Math.round((v.getTime() - Date.UTC(1899, 11, 30)) / 60000);
  if (typeof v === "number") return Math.round(v * 1440);
  return 0;
}

const avisos = [];
const registros = [];
const resumenes = [];
const CATEGORIA_TITULO = { "horas en el mes": "asunto_personal", "citas medicas": "cita_medica", "entradas tarde": "entrada_tardia", "entradas tardes": "entrada_tardia" };

for (const archivo of archivos) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(archivo);
  const corto = path.basename(archivo);
  const [resumen, ...hojas] = wb.worksheets;

  let categoria = null;
  resumen.eachRow((row) => {
    const c3 = norm(texto(row.getCell(3).value));
    if (CATEGORIA_TITULO[c3]) categoria = CATEGORIA_TITULO[c3];
    const nombre = texto(row.getCell(2).value);
    if (!categoria || typeof nombre !== "string" || /nombres|total/i.test(nombre) || typeof row.getCell(1).value !== "number") return;
    const m = buscarPersona(nombre);
    if (m.length !== 1) return;
    for (let mes = 1; mes <= 12; mes++) {
      resumenes.push({ nit: m[0].nit, nombre: m[0].nombre, categoria, mes, minutos: duracion(row.getCell(2 + mes).value), origen: corto });
    }
  });

  for (const ws of hojas) {
    const m = buscarPersona(ws.name);
    if (m.length !== 1) {
      let n = 0;
      ws.eachRow((row) => row.eachCell((c) => RE_DIA.test(norm(texto(c.value))) && n++));
      avisos.push(`${corto} · hoja "${ws.name}": ${m.length ? "coincide con varias personas" : "no se encontró en el directorio"}; se omiten sus ${n} registros`);
      continue;
    }
    const persona = m[0];
    ws.eachRow((row, r) => {
      for (const col of [1, 8]) {
        const dia = norm(texto(row.getCell(col).value));
        const md = dia.match(RE_DIA);
        if (!md) continue;
        const [, nombreDia, dd, mm] = md;
        const fecha = `${ANIO}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
        const origen = `${corto} · ${ws.name} · fila ${r}`;
        const real = DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()];
        if (real !== nombreDia) avisos.push(`${origen}: dice "${nombreDia} ${dd}/${mm}" pero el ${dd}/${mm}/${ANIO} es ${real}`);
        const motivo = String(texto(row.getCell(col + 3).value) ?? "").replace(/\s+/g, " ").trim() || "Sin motivo";
        const tipo = tipoDe(motivo);
        let de = hora(row.getCell(col + 1).value);
        let a = hora(row.getCell(col + 2).value);
        if (tipo === "nota_marcaje") de = a = null;
        else if (!de || !a) {
          avisos.push(`${origen}: "${motivo}" sin horario completo; se omite`);
          continue;
        }
        registros.push({ nit: persona.nit, nombre: persona.nombre, fecha, tipo, hora_inicio: de, hora_fin: a, motivo, origen });
      }
    });
  }
}

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(new Date());
const validos = registros.filter((r) => {
  if (r.fecha > hoy) {
    avisos.push(`${r.origen}: fecha ${r.fecha.split("-").reverse().join("/")} todavía no ha pasado; se omite`);
    return false;
  }
  if (r.tipo === "nota_marcaje") return true;
  const fuera = r.hora_inicio < "08:00" || r.hora_fin > "16:30" || r.hora_fin <= r.hora_inicio || (r.tipo === "entrada_tardia" && r.hora_inicio !== "08:00");
  if (fuera) avisos.push(`${r.origen}: horario ${r.hora_inicio} a ${r.hora_fin} no válido para ${r.tipo}; se omite`);
  return !fuera;
});

const leido = new Map();
for (const r of validos) {
  if (!["asunto_personal", "cita_medica", "entrada_tardia"].includes(r.tipo)) continue;
  const k = `${r.nit}|${r.tipo}|${Number(r.fecha.slice(5, 7))}`;
  leido.set(k, (leido.get(k) ?? 0) + minutos(r.hora_inicio, r.hora_fin));
}
const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const NOMBRE_CAT = { asunto_personal: "Horas en el mes", cita_medica: "Citas médicas", entrada_tardia: "Entradas tarde" };
const MES = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const diferencias = [];
const vistos = new Set();
for (const s of resumenes) {
  const k = `${s.nit}|${s.categoria}|${s.mes}`;
  vistos.add(k);
  const l = leido.get(k) ?? 0;
  if (l !== s.minutos) diferencias.push(`${s.nombre} · ${NOMBRE_CAT[s.categoria]} · ${MES[s.mes]}: resumen del Excel ${fmt(s.minutos)}, detalle ${fmt(l)}`);
}
for (const [k, l] of leido) {
  if (vistos.has(k)) continue;
  const [nit, cat, mes] = k.split("|");
  diferencias.push(`${usuarios.find((u) => u.nit === nit)?.nombre} · ${NOMBRE_CAT[cat]} · ${MES[mes]}: no está en el resumen, detalle ${fmt(l)}`);
}

const porTipo = validos.reduce((acc, r) => ((acc[r.tipo] = (acc[r.tipo] ?? 0) + 1), acc), {});
console.log(`\nLeídos ${validos.length} registros de ${new Set(validos.map((r) => r.nit)).size} personas:`, porTipo);
if (avisos.length) console.log(`\nAvisos (${avisos.length}):\n  ` + avisos.join("\n  "));
if (diferencias.length) console.log(`\nMeses que no cuadran con la hoja resumen (${diferencias.length}):\n  ` + diferencias.join("\n  "));

if (!CARGAR) {
  console.log("\nSolo revisión. Agregue --cargar para guardar en la base local.");
  process.exit(0);
}

const registrador =
  usuarios.find((u) => u.nit === "PRUEBA-DIR") ?? usuarios.find((u) => u.permiso_sistema === "control_total");
if (!registrador) throw new Error("No hay ningún usuario con control total para figurar como quien registró.");
const nits = [...new Set(validos.map((r) => r.nit))];
ok(
  await sb.from("permisos_personal").delete().in("usuario_nit", nits).gte("fecha", `${ANIO}-01-01`).lte("fecha", `${ANIO}-12-31`),
  "borrar anteriores",
);
ok(
  await sb.from("permisos_personal").insert(
    validos.map((r) => ({
      usuario_nit: r.nit,
      fecha: r.fecha,
      tipo: r.tipo,
      hora_inicio: r.hora_inicio,
      hora_fin: r.hora_fin,
      motivo: r.motivo,
      registrado_por_nit: registrador.nit,
    })),
  ),
  "insertar",
);
console.log(`\nCargados ${validos.length} registros (registrados a nombre de ${registrador.nombre}).`);
