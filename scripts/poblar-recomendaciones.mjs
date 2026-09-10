// Datos de demostración para /recomendaciones — SOLO instancia local (Docker), mismo criterio
// de seguridad que scripts/poblar-demo.mjs. Uso: correr después de scripts/poblar-demo.mjs
// (necesita esos 15 usuarios de prueba y los 3 departamentos).
//
// Crea 2 informes de auditoría (uno en Financieras con 2 deficiencias/3 recomendaciones en
// distintos estados y varias rondas de seguimiento; otro en Administrativas con 1 deficiencia
// ya totalmente atendida) para verificar los 3 estados, el conteo por informe, el filtro
// "solo pendientes/en proceso" y el historial de seguimientos en el detalle.

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

const JEFE_DAF = "8888-JEFE";
const AUDITOR_4 = "4444-AUD4";
const AUDITOR_5 = "4445-AUD5";
const JEFE_DAAP = "8889-JEFE2";
const AUDITOR_6 = "4446-AUD6";

const { data: departamentos } = await sb.from("departamentos").select("id, nombre");
const depDAF = departamentos.find((d) => d.nombre === "Departamento de Auditorías Financieras");
const depDAAP = departamentos.find((d) => d.nombre === "Departamento de Auditorías Administrativas y de Procesos");

const informe1 = {
  id: "aaaaaaaa-0001-4000-8000-000000000001",
  no_nombramiento: "NAI-031-2024",
  cai: "31",
  departamento_id: depDAF.id,
  dependencia_auditada: "Recursos Humanos",
  periodo_auditado_inicio: "2024-01-01",
  periodo_auditado_fin: "2024-06-30",
  fecha: "2024-08-10",
  fecha_informe_final: "2024-11-23",
  supervisor_nit: JEFE_DAF,
  coordinador_nit: AUDITOR_5,
  riesgo: "Falta de pago oportuno de prestaciones laborales al personal.",
  creado_por_nit: JEFE_DAF,
};

const informe2 = {
  id: "aaaaaaaa-0002-4000-8000-000000000002",
  no_nombramiento: "NAI-014-2025",
  cai: "14",
  departamento_id: depDAAP.id,
  dependencia_auditada: "Compras y Contrataciones",
  periodo_auditado_inicio: "2025-01-01",
  periodo_auditado_fin: "2025-03-31",
  fecha: "2025-05-05",
  fecha_informe_final: "2025-07-15",
  supervisor_nit: JEFE_DAAP,
  coordinador_nit: null,
  riesgo: "Expedientes de contratación incompletos.",
  creado_por_nit: JEFE_DAAP,
};

await sb.from("informes_auditoria").upsert([informe1, informe2]);

await sb.from("informes_auditoria_equipo").upsert(
  [
    { informe_id: informe1.id, usuario_nit: AUDITOR_4 },
    { informe_id: informe1.id, usuario_nit: AUDITOR_5 },
    { informe_id: informe2.id, usuario_nit: AUDITOR_6 },
  ],
  { onConflict: "informe_id,usuario_nit" },
);

// Informe 1: deficiencia con 2 recomendaciones (una atendida, una en proceso con 2 rondas de
// seguimiento — para verificar que la ronda 2 solo lista lo que seguía pendiente después de la
// ronda 1) y otra deficiencia con 1 recomendación todavía pendiente (sin ningún seguimiento).
const def1 = { id: "aaaaaaaa-0001-4000-8000-0000000000d1", informe_id: informe1.id, numero: 1, titulo: "Pagos de prestaciones fuera de plazo", descripcion: "Se identificaron pagos de indemnización realizados fuera del plazo legal.", creado_por_nit: AUDITOR_4 };
const def2 = { id: "aaaaaaaa-0001-4000-8000-0000000000d2", informe_id: informe1.id, numero: 2, titulo: "Expedientes de personal incompletos", descripcion: null, creado_por_nit: AUDITOR_4 };

await sb.from("deficiencias").upsert([def1, def2]);

const rec1 = { id: "aaaaaaaa-0001-4000-8000-0000000000e1", deficiencia_id: def1.id, numero: 1, texto: "Implementar un control de alertas para pagos próximos a vencer.", fecha_implementacion: "2025-11-23", creado_por_nit: AUDITOR_4 };
const rec2 = { id: "aaaaaaaa-0001-4000-8000-0000000000e2", deficiencia_id: def1.id, numero: 2, texto: "Capacitar al personal de RRHH sobre plazos legales de pago.", fecha_implementacion: "2025-11-23", creado_por_nit: AUDITOR_4 };
const rec3 = { id: "aaaaaaaa-0001-4000-8000-0000000000e3", deficiencia_id: def2.id, numero: 1, texto: "Completar los expedientes de personal faltantes.", fecha_implementacion: "2025-11-23", creado_por_nit: AUDITOR_4 };

await sb.from("recomendaciones").upsert([rec1, rec2, rec3]);

// rec1: 1 ronda -> atendida. rec2: 2 rondas -> en proceso (todavía no queda atendida, así que
// sigue apareciendo en el filtro de pendientes). rec3: sin ninguna ronda -> pendiente por
// default.
await sb.from("seguimientos_recomendacion").upsert(
  [
    { recomendacion_id: rec1.id, numero_seguimiento: 1, no_informe_seguimiento: "DAI-02-2025", fecha: "2025-08-12", estado: "atendida", comentario: "Verificado en sistema de nómina.", registrado_por_nit: AUDITOR_5 },
    { recomendacion_id: rec2.id, numero_seguimiento: 1, no_informe_seguimiento: "DAI-02-2025", fecha: "2025-08-12", estado: "en_proceso", comentario: "Capacitación programada, aún no ejecutada.", registrado_por_nit: AUDITOR_5 },
    { recomendacion_id: rec2.id, numero_seguimiento: 2, no_informe_seguimiento: "DAI-09-2026", fecha: "2026-08-11", estado: "en_proceso", comentario: "Capacitación en curso, primera sesión realizada.", registrado_por_nit: AUDITOR_4 },
  ],
  { onConflict: "recomendacion_id,numero_seguimiento" },
);

// Informe 2: 1 deficiencia con 1 recomendación ya atendida en la primera ronda, para probar el
// caso "toda una deficiencia queda resuelta".
const def3 = { id: "aaaaaaaa-0002-4000-8000-0000000000d1", informe_id: informe2.id, numero: 1, titulo: "Falta de cotizaciones mínimas en expedientes", descripcion: null, creado_por_nit: AUDITOR_6 };
await sb.from("deficiencias").upsert([def3]);

const rec4 = { id: "aaaaaaaa-0002-4000-8000-0000000000e1", deficiencia_id: def3.id, numero: 1, texto: "Exigir mínimo 3 cotizaciones antes de adjudicar.", fecha_implementacion: "2025-10-01", creado_por_nit: AUDITOR_6 };
await sb.from("recomendaciones").upsert([rec4]);

await sb.from("seguimientos_recomendacion").upsert(
  [{ recomendacion_id: rec4.id, numero_seguimiento: 1, no_informe_seguimiento: "DAI-05-2025", fecha: "2025-10-20", estado: "atendida", comentario: "Ya se exige en el nuevo procedimiento.", registrado_por_nit: JEFE_DAAP }],
  { onConflict: "recomendacion_id,numero_seguimiento" },
);

console.log("Listo: 2 informes, 3 deficiencias, 4 recomendaciones y 4 rondas de seguimiento insertadas.");
