// Carga el personal real de la DAI en la instancia LOCAL de Supabase (Docker) — nunca el remoto.
//
// Fuentes (ambas ignoradas por git porque contienen datos personales):
//   - PERSONAL DAI.xlsx        -> la lista de nombres (columna B, desde la fila 2).
//   - personal-roles.local.json -> cargo/departamento/puesto de quienes ya se conocen, por nombre
//                                  tal como aparece en el Excel. Quien no esté ahí queda como
//                                  auditor SIN departamento hasta que se sepa (ver --actualizar).
//
// NIT ficticios (DAI-001...), correos de prueba @scidai.test y una clave aleatoria por corrida.
// Uso, después de `npx supabase db reset`:
//   node scripts/cargar-personal-real.mjs
// Escribe credenciales-prueba.local.txt (ignorado por git) con los accesos creados.

import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function cargarEnv(archivo) {
  const env = {};
  for (const linea of readFileSync(path.join(ROOT, archivo), "utf8").split("\n")) {
    const m = linea.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = cargarEnv(".env.development.local");
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.development.local");
if (!SUPABASE_URL.includes("127.0.0.1") && !SUPABASE_URL.includes("localhost")) {
  throw new Error(`Este script solo corre contra la instancia LOCAL de Supabase. URL detectada: ${SUPABASE_URL}`);
}
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// Clave aleatoria por corrida (no hay una clave fija en el repo): queda solo en credenciales-prueba.local.txt.
const CLAVE = randomBytes(12).toString("base64url");
const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y"]);

const sinAcentos = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const clave = (t) => sinAcentos(t).toUpperCase().replace(/\s+/g, " ").trim();
const slug = (t) => sinAcentos(t).toLowerCase().replace(/[^a-z0-9]/g, "");

function titulo(nombre) {
  return nombre
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((p, i) => (i > 0 && PARTICULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ")
    .replace(/\bMcnish\b/, "McNish");
}

function correoDe(nombre, usados) {
  const t = clave(nombre).split(" ").filter((p) => !PARTICULAS.has(p.toLowerCase()));
  const apellido = t.length >= 4 ? t[2] : t[1];
  let base = `${slug(t[0])}.${slug(apellido)}`;
  let correo = `${base}@scidai.test`;
  for (let n = 2; usados.has(correo); n++) correo = `${base}${n}@scidai.test`;
  usados.add(correo);
  return correo;
}

// ── Lista de personal ──
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(path.join(ROOT, "PERSONAL DAI.xlsx"));
const hoja = wb.worksheets[0];
const nombres = [];
hoja.eachRow((fila, n) => {
  if (n === 1) return;
  const v = String(fila.getCell(2).value ?? "").trim();
  if (v) nombres.push(v);
});

const roles = JSON.parse(readFileSync(path.join(ROOT, "personal-roles.local.json"), "utf8"));
const rolesPorClave = new Map(Object.entries(roles).map(([n, r]) => [clave(n), r]));
const sinMatch = [...rolesPorClave.keys()].filter((k) => !nombres.some((n) => clave(n) === k));
if (sinMatch.length) console.warn("Roles que no están en el Excel:", sinMatch);

const { data: departamentos } = await sb.from("departamentos").select("id, nombre");
const { data: subdirecciones } = await sb.from("subdirecciones").select("id, nombre");
const depId = (n) => {
  const d = departamentos.find((x) => x.nombre === n);
  if (!d) throw new Error(`Departamento no encontrado: ${n}`);
  return d.id;
};

// ── Usuarios ──
const usadosCorreo = new Set();
const creados = [];
for (const [i, nombreExcel] of nombres.entries()) {
  const rol = rolesPorClave.get(clave(nombreExcel));
  const nit = `DAI-${String(i + 1).padStart(3, "0")}`;
  const correo = correoDe(nombreExcel, usadosCorreo);
  const nombre = titulo(nombreExcel);

  const { data: auth, error: errAuth } = await sb.auth.admin.createUser({ email: correo, password: CLAVE, email_confirm: true });
  if (errAuth) throw new Error(`No se pudo crear el acceso de ${nombre}: ${errAuth.message}`);

  const usuario = {
    nit,
    auth_user_id: auth.user.id,
    nombre,
    puesto: rol?.puesto ?? "Auditor",
    correo,
    departamento_id: rol?.departamento ? depId(rol.departamento) : null,
    cargo: rol?.cargo ?? "auditor",
    permiso_sistema: rol?.permiso ?? "captura_propia",
    activo: true,
  };
  const { error } = await sb.from("usuarios").insert(usuario);
  if (error) throw new Error(`Insert de ${nombre} falló: ${error.message}`);
  creados.push({ ...usuario, subdireccion: rol?.subdireccion });
}

// Cada subdirector queda registrado en su subdirección (de ahí sale su alcance).
for (const u of creados.filter((c) => c.cargo === "subdirector")) {
  const sd = subdirecciones.find((s) => s.nombre === u.subdireccion);
  if (!sd) throw new Error(`Subdirección no encontrada para ${u.nombre}: ${u.subdireccion}`);
  const { error } = await sb.from("subdirecciones").update({ subdirector_nit: u.nit }).eq("id", sd.id);
  if (error) throw new Error(`No se pudo asignar subdirector: ${error.message}`);
}

// ── Credenciales (ignoradas por git) ──
const lineas = [
  "Cuentas de prueba — SOLO existen en la instancia local de Supabase (Docker).",
  "Personal real de la DAI con NIT y correos ficticios. No existen en el remoto ni en producción.",
  `Clave de todas (de esta carga): ${CLAVE}`,
  "Se recrean con: npx supabase db reset  &&  node scripts/cargar-personal-real.mjs",
  "",
  ...creados
    .sort((a, b) => ["director", "subdirector", "jefe", "subjefe", "auditor"].indexOf(a.cargo) - ["director", "subdirector", "jefe", "subjefe", "auditor"].indexOf(b.cargo))
    .map((u) => `${u.nombre} — ${u.puesto}\n  correo: ${u.correo}   nit: ${u.nit}`),
];
writeFileSync(path.join(ROOT, "credenciales-prueba.local.txt"), lineas.join("\n") + "\n");

const porCargo = Object.fromEntries(["director", "subdirector", "jefe", "subjefe", "auditor"].map((c) => [c, creados.filter((u) => u.cargo === c).length]));
console.log(`Listo: ${creados.length} personas con acceso.`, porCargo);
console.log(`Auditores sin departamento: ${creados.filter((u) => u.cargo === "auditor" && !u.departamento_id).length}`);
