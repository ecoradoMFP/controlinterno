// Datos de demostración para /capacitaciones — SOLO para la instancia local de Supabase
// (Docker), mismo criterio de seguridad que scripts/poblar-demo.mjs (rechaza correr si
// NEXT_PUBLIC_SUPABASE_URL no apunta a 127.0.0.1/localhost).
//
// Uso: correr después de scripts/poblar-demo.mjs (necesita que existan sus 15 usuarios de
// prueba). Da a cada persona una cantidad de horas 2026 distinta a propósito, para que
// aparezcan los 4 colores del semáforo de cumplimiento y los 3 departamentos en el dashboard.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function cargarEnv(archivo) {
  const contenido = readFileSync(path.join(ROOT, archivo), "utf8");
  const env = {};
  for (const linea of contenido.split("\n")) {
    const m = linea.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = cargarEnv(".env.development.local");
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.development.local");
}
if (!SUPABASE_URL.includes("127.0.0.1") && !SUPABASE_URL.includes("localhost")) {
  throw new Error(`Este script solo corre contra la instancia LOCAL de Supabase. URL detectada: ${SUPABASE_URL}`);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// nit de quien "carga" cada registro: el propio jefe/director para su gente, o Dirección para
// Subdirección (que no tiene jefe por encima).
const JEFE_DAF = "8888-JEFE";
const JEFE_DAAP = "8889-JEFE2";
const JEFE_DAE = "8890-JEFE3";
const DIRECTORA = "9999-DIR";

// Cada entrada: nit de la persona, y sus capacitaciones del año (nombre, institución, horas,
// fecha) — la suma de horas por persona está elegida para caer en cada uno de los 4 colores
// (verde ≥50, amarillo 25-49, naranja 0-25, rojo 0), repartida entre los 3 departamentos más
// Dirección/Subdirección.
const DATOS_2026 = [
  {
    nit: DIRECTORA,
    registradoPor: DIRECTORA,
    capacitaciones: [
      { nombre: "Liderazgo Institucional", institucion: "INAP", horas: 20, fecha: "2026-02-10" },
      { nombre: "Gobernanza y Control Interno", institucion: "OLACEFS", horas: 35, fecha: "2026-05-14" },
    ],
  },
  {
    nit: "3333-SUBD",
    registradoPor: DIRECTORA,
    capacitaciones: [{ nombre: "Auditoría Basada en Riesgos (avanzado)", institucion: "Contraloría General de Cuentas", horas: 30, fecha: "2026-03-03" }],
  },
  {
    nit: "3334-SUBD2",
    registradoPor: DIRECTORA,
    capacitaciones: [],
  },
  {
    nit: JEFE_DAF,
    registradoPor: JEFE_DAF,
    capacitaciones: [
      { nombre: "NIIF para el Sector Público", institucion: "Colegio de Contadores", horas: 25, fecha: "2026-01-20" },
      { nombre: "Normas Internacionales de Auditoría", institucion: "IAASB", horas: 35, fecha: "2026-06-11" },
    ],
  },
  {
    nit: "6666-SUBJ",
    registradoPor: JEFE_DAF,
    capacitaciones: [{ nombre: "Muestreo Estadístico en Auditoría", institucion: "INAP", horas: 45, fecha: "2026-04-22" }],
  },
  {
    nit: "4444-AUD4",
    registradoPor: JEFE_DAF,
    capacitaciones: [{ nombre: "Ética Pública", institucion: "ONSEC", horas: 20, fecha: "2026-02-18" }],
  },
  { nit: "4445-AUD5", registradoPor: JEFE_DAF, capacitaciones: [] },
  {
    nit: JEFE_DAAP,
    registradoPor: JEFE_DAAP,
    capacitaciones: [{ nombre: "Auditoría de Procesos Administrativos", institucion: "OLACEFS", horas: 50, fecha: "2026-03-30" }],
  },
  {
    nit: "6667-SUBJ2",
    registradoPor: JEFE_DAAP,
    capacitaciones: [{ nombre: "Control Interno COSO", institucion: "Contraloría General de Cuentas", horas: 15, fecha: "2026-05-05" }],
  },
  {
    nit: "4446-AUD6",
    registradoPor: JEFE_DAAP,
    capacitaciones: [
      { nombre: "Redacción de Informes de Auditoría", institucion: "INAP", horas: 15, fecha: "2026-01-28" },
      { nombre: "Normativa de Contrataciones del Estado", institucion: "Contraloría General de Cuentas", horas: 20, fecha: "2026-07-09" },
    ],
  },
  { nit: "4447-AUD7", registradoPor: JEFE_DAAP, capacitaciones: [] },
  {
    nit: JEFE_DAE,
    registradoPor: JEFE_DAE,
    capacitaciones: [
      { nombre: "Auditoría Forense", institucion: "ACFE", horas: 40, fecha: "2026-02-25" },
      { nombre: "Investigación de Denuncias", institucion: "Contraloría General de Cuentas", horas: 25, fecha: "2026-08-14" },
    ],
  },
  {
    nit: "6668-SUBJ3",
    registradoPor: JEFE_DAE,
    capacitaciones: [{ nombre: "Análisis de Datos para Auditoría", institucion: "INAP", horas: 10, fecha: "2026-04-02" }],
  },
  {
    nit: "4448-AUD8",
    registradoPor: JEFE_DAE,
    capacitaciones: [{ nombre: "Normas Internacionales de Auditoría", institucion: "IAASB", horas: 48, fecha: "2026-06-19" }],
  },
  { nit: "4449-AUD9", registradoPor: JEFE_DAE, capacitaciones: [] },
];

let total = 0;
for (const persona of DATOS_2026) {
  for (const c of persona.capacitaciones) {
    const { error } = await sb.from("capacitaciones").insert({
      usuario_nit: persona.nit,
      registrado_por_nit: persona.registradoPor,
      nombre: c.nombre,
      institucion: c.institucion,
      horas: c.horas,
      fecha: c.fecha,
    });
    if (error) throw new Error(`Insert capacitación para ${persona.nit} falló: ${error.message}`);
    total += 1;
  }
}

console.log(`Listo: ${total} capacitaciones insertadas para ${DATOS_2026.length} personas (año 2026).`);
