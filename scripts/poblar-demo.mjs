// Datos de demostración para /reportes (BI) — SOLO para la instancia local de Supabase
// (Docker). Nunca se ejecuta contra el proyecto remoto: lee las credenciales directamente de
// `.env.development.local` (gitignored), que apunta a http://127.0.0.1:54321.
//
// Uso: correr `npx supabase db reset` primero (deja solo los datos estructurales de
// `supabase/seed.sql`: subdirecciones, departamentos, catálogo de documentos, feriados,
// umbrales), y luego `node scripts/poblar-demo.mjs` para sembrar usuarios, actividades,
// hitos, documentos/movimientos y oficios con variedad suficiente para poblar los
// indicadores, gráficas y desgloses del tablero de reportes.
//
// Recrea las mismas 5 cuentas de acceso ya documentadas en credenciales-prueba.local.txt
// (mismos NIT/correos/clave) para que ese archivo siga siendo válido después de un reset.

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

const CLAVE = "PruebaSegura123!";

function addDays(iso, dias) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function fechaHora(iso, horas = 9) {
  return new Date(`${iso}T00:00:00Z`).getTime() + horas * 3600_000;
}
function isoDesdeMs(ms) {
  return new Date(ms).toISOString();
}

async function inserta(tabla, filas, extra = {}) {
  if (filas.length === 0) return [];
  const { data, error } = await sb.from(tabla).insert(filas, extra).select();
  if (error) throw new Error(`Insert en ${tabla} falló: ${error.message}`);
  return data;
}

async function main() {
  // ── 1. Estructura organizacional (ya sembrada por seed.sql) ──
  const { data: subdirecciones } = await sb.from("subdirecciones").select("id, nombre");
  const { data: departamentos } = await sb.from("departamentos").select("id, nombre");
  const { data: catalogo } = await sb.from("documentos_catalogo").select("id, etapa, orden").order("orden");

  const sdFinancierasAdmin = subdirecciones.find((s) => s.nombre.startsWith("Subdirección de Auditorías Financieras"));
  const sdEspeciales = subdirecciones.find((s) => s.nombre === "Subdirección de Auditorías Especiales");
  const depDAF = departamentos.find((d) => d.nombre === "Departamento de Auditorías Financieras");
  const depDAAP = departamentos.find((d) => d.nombre === "Departamento de Auditorías Administrativas y de Procesos");
  const depDAE = departamentos.find((d) => d.nombre === "Departamento de Auditorías Especiales");

  const catPorEtapa = { planificacion: [], ejecucion: [], comunicacion_resultados: [] };
  for (const c of catalogo) catPorEtapa[c.etapa].push(c);

  console.log("Estructura organizacional cargada:", { depDAF: !!depDAF, depDAAP: !!depDAAP, depDAE: !!depDAE });

  // ── 2. Usuarios ──
  const usuarios = [
    { nit: "9999-DIR", nombre: "Directora de Prueba", cargo: "director", departamento_id: null, permiso_sistema: "control_total", correo: "director.prueba@minfin.gob.gt", auth: true },
    { nit: "3333-SUBD", nombre: "Subdirectora de Prueba", cargo: "subdirector", departamento_id: null, permiso_sistema: "captura_propia", correo: "subdirector.prueba@minfin.gob.gt", auth: true },
    { nit: "3334-SUBD2", nombre: "Subdirector de Auditorías Especiales", cargo: "subdirector", departamento_id: null, permiso_sistema: "captura_propia", correo: "subdirector.especiales@minfin.gob.gt", auth: false },
    { nit: "8888-JEFE", nombre: "Jefe Financieras Prueba", cargo: "jefe", departamento_id: depDAF.id, permiso_sistema: "captura_propia", correo: "jefe.financieras@minfin.gob.gt", auth: true },
    { nit: "6666-SUBJ", nombre: "Subjefe Financieras Prueba", cargo: "subjefe", departamento_id: depDAF.id, permiso_sistema: "captura_propia", correo: "subjefe.financieras@minfin.gob.gt", auth: true },
    { nit: "4444-AUD4", nombre: "Auditor Nuevo Cuatro", cargo: "auditor", departamento_id: depDAF.id, permiso_sistema: "captura_propia", correo: "auditor.nuevo4@minfin.gob.gt", auth: true },
    { nit: "4445-AUD5", nombre: "Auditora Cinco", cargo: "auditor", departamento_id: depDAF.id, permiso_sistema: "captura_propia", correo: "auditor.cinco@minfin.gob.gt", auth: false },
    { nit: "8889-JEFE2", nombre: "Jefe Administrativas Prueba", cargo: "jefe", departamento_id: depDAAP.id, permiso_sistema: "captura_propia", correo: "jefe.administrativas@minfin.gob.gt", auth: false },
    { nit: "6667-SUBJ2", nombre: "Subjefe Administrativas Prueba", cargo: "subjefe", departamento_id: depDAAP.id, permiso_sistema: "captura_propia", correo: "subjefe.administrativas@minfin.gob.gt", auth: false },
    { nit: "4446-AUD6", nombre: "Auditor Seis", cargo: "auditor", departamento_id: depDAAP.id, permiso_sistema: "captura_propia", correo: "auditor.seis@minfin.gob.gt", auth: false },
    { nit: "4447-AUD7", nombre: "Auditora Siete", cargo: "auditor", departamento_id: depDAAP.id, permiso_sistema: "captura_propia", correo: "auditor.siete@minfin.gob.gt", auth: false },
    { nit: "8890-JEFE3", nombre: "Jefe Especiales Prueba", cargo: "jefe", departamento_id: depDAE.id, permiso_sistema: "captura_propia", correo: "jefe.especiales@minfin.gob.gt", auth: false },
    { nit: "6668-SUBJ3", nombre: "Subjefe Especiales Prueba", cargo: "subjefe", departamento_id: depDAE.id, permiso_sistema: "captura_propia", correo: "subjefe.especiales@minfin.gob.gt", auth: false },
    { nit: "4448-AUD8", nombre: "Auditor Ocho", cargo: "auditor", departamento_id: depDAE.id, permiso_sistema: "captura_propia", correo: "auditor.ocho@minfin.gob.gt", auth: false },
    { nit: "4449-AUD9", nombre: "Auditora Nueve", cargo: "auditor", departamento_id: depDAE.id, permiso_sistema: "captura_propia", correo: "auditor.nueve@minfin.gob.gt", auth: false },
  ];

  for (const u of usuarios) {
    let authUserId = null;
    if (u.auth) {
      const { data, error } = await sb.auth.admin.createUser({
        email: u.correo,
        password: CLAVE,
        email_confirm: true,
      });
      if (error) throw new Error(`No se pudo crear auth user ${u.correo}: ${error.message}`);
      authUserId = data.user.id;
    }
    const { error: errUsuario } = await sb.from("usuarios").insert({
      nit: u.nit,
      auth_user_id: authUserId,
      nombre: u.nombre,
      puesto: null,
      correo: u.correo,
      departamento_id: u.departamento_id,
      cargo: u.cargo,
      permiso_sistema: u.permiso_sistema,
      activo: true,
    });
    if (errUsuario) throw new Error(`Insert usuario ${u.nit} falló: ${errUsuario.message}`);
  }
  console.log(`${usuarios.length} usuarios creados (${usuarios.filter((u) => u.auth).length} con acceso).`);

  await sb.from("subdirecciones").update({ subdirector_nit: "3333-SUBD" }).eq("id", sdFinancierasAdmin.id);
  await sb.from("subdirecciones").update({ subdirector_nit: "3334-SUBD2" }).eq("id", sdEspeciales.id);

  // ── 3. Actividades ──
  const actividadesDef = [
    {
      no: "NAI-001-2026", dep: depDAF.id, auditor: "4444-AUD4", equipo: ["4444-AUD4", "4445-AUD5"], equipoCompleto: false,
      etapa: "planificacion", dependencia: "Tesorería Nacional — Fondo Rotativo", tipo: "Financiera y de Cumplimiento",
      periodoIni: "2026-01-01", periodoFin: "2026-06-30", inicioPlazo: "2026-08-20", notificacion: "2026-08-25",
    },
    {
      no: "NAI-002-2026", dep: depDAF.id, auditor: "4445-AUD5", equipo: ["4445-AUD5", "4444-AUD4"], equipoCompleto: true,
      etapa: "ejecucion", dependencia: "Dirección de Contabilidad del Estado — Conciliaciones Bancarias", tipo: "Financiera",
      periodoIni: "2025-07-01", periodoFin: "2025-12-31", inicioPlazo: "2026-07-01", notificacion: "2026-07-06",
    },
    {
      no: "NAI-003-2026", dep: depDAF.id, auditor: "4444-AUD4", equipo: ["4444-AUD4", "4445-AUD5"], equipoCompleto: true,
      etapa: "expediente_cierre", dependencia: "Tesorería Nacional — Cuentas por Pagar", tipo: "Financiera y de Cumplimiento",
      periodoIni: "2025-01-01", periodoFin: "2025-06-30", inicioPlazo: "2026-02-01", notificacion: "2026-02-05",
    },
    {
      no: "NAI-004-2026", dep: depDAAP.id, auditor: "4446-AUD6", equipo: ["4446-AUD6", "4447-AUD7"], equipoCompleto: true,
      etapa: "planificacion", dependencia: "Dirección de Recursos Humanos — Procesos de Contratación", tipo: "Administrativa",
      periodoIni: "2026-01-01", periodoFin: "2026-06-30", inicioPlazo: "2026-08-24", notificacion: "2026-08-28",
    },
    {
      no: "NAI-005-2026", dep: depDAAP.id, auditor: "4447-AUD7", equipo: ["4447-AUD7", "4446-AUD6"], equipoCompleto: true,
      etapa: "ejecucion", dependencia: "Dirección de Adquisiciones del Estado — Procesos de Compra", tipo: "Cumplimiento",
      periodoIni: "2025-07-01", periodoFin: "2025-12-31", inicioPlazo: "2026-07-15", notificacion: "2026-07-20",
    },
    {
      no: "NAI-006-2026", dep: depDAAP.id, auditor: "4446-AUD6", equipo: ["4446-AUD6", "4447-AUD7"], equipoCompleto: true,
      etapa: "comunicacion_resultados", dependencia: "Dirección de Bienes del Estado — Inventarios", tipo: "Administrativa y de Procesos",
      periodoIni: "2025-01-01", periodoFin: "2025-06-30", inicioPlazo: "2026-05-01", notificacion: "2026-05-06",
    },
    {
      no: "NAI-007-2026", dep: depDAE.id, auditor: "4448-AUD8", equipo: ["4448-AUD8", "4449-AUD9"], equipoCompleto: true,
      etapa: "ejecucion", dependencia: "Superintendencia de Administración Tributaria — Proyecto Especial", tipo: "Especial",
      periodoIni: "2026-01-01", periodoFin: "2026-03-31", inicioPlazo: "2026-07-10", notificacion: "2026-07-15",
    },
    {
      no: "NAI-008-2026", dep: depDAE.id, auditor: "4449-AUD9", equipo: ["4449-AUD9", "4448-AUD8"], equipoCompleto: true,
      etapa: "comunicacion_resultados", dependencia: "Instituto de Fomento Municipal — Proyecto de Infraestructura", tipo: "Especial",
      periodoIni: "2025-10-01", periodoFin: "2025-12-31", inicioPlazo: "2026-04-01", notificacion: "2026-04-08",
    },
  ];

  const actividades = await inserta(
    "actividades",
    actividadesDef.map((a) => ({
      no_nombramiento: a.no,
      departamento_id: a.dep,
      auditor_principal_nit: a.auditor,
      dependencia_auditada: a.dependencia,
      tipo_auditoria: a.tipo,
      periodo_evaluado_inicio: a.periodoIni,
      periodo_evaluado_fin: a.periodoFin,
      fecha_inicio_plazo: a.inicioPlazo,
      fecha_notificacion: a.notificacion,
      etapa_actual: a.etapa,
    })),
  );
  const actividadPorNo = new Map(actividades.map((a) => [a.no_nombramiento, a]));
  console.log(`${actividades.length} actividades creadas.`);

  // ── 4. Equipos ──
  const filasEquipo = [];
  for (const def of actividadesDef) {
    const actividad = actividadPorNo.get(def.no);
    for (const nit of def.equipo) {
      filasEquipo.push({
        actividad_id: actividad.id,
        usuario_nit: nit,
        rol_en_equipo: nit === def.auditor ? "Auditor principal" : "Auditor de apoyo",
        fecha_recibido: def.equipoCompleto ? def.inicioPlazo : nit === def.auditor ? def.inicioPlazo : null,
        fecha_declaracion_independencia: def.equipoCompleto ? def.inicioPlazo : nit === def.auditor ? def.inicioPlazo : null,
      });
    }
  }
  await inserta("actividades_equipo", filasEquipo);
  console.log(`${filasEquipo.length} confirmaciones de equipo creadas.`);

  // ── 5. Hitos de cronograma ──
  // 4 rangos ya validados contra el motor real de semáforo (src/lib/semaforo.ts) para caer
  // limpiamente en cada uno de los 4 colores a partir de HOY=2026-09-04.
  const RANGO = {
    rojo: ["2026-08-01", "2026-08-25"],
    naranja: ["2026-08-10", "2026-09-08"],
    amarillo: ["2026-08-17", "2026-09-16"],
    verde: ["2026-09-01", "2026-09-25"],
  };
  const ORDEN_ETAPA_DOC = ["planificacion", "ejecucion", "comunicacion_resultados"];
  const DIAS_PLAN = { planificacion: 5, ejecucion: 10, comunicacion_resultados: 6 };
  const DELTA_REAL_CALENDARIO = { planificacion: [-1, 3], ejecucion: [-2, 5], comunicacion_resultados: [-1, 4] };

  // Color del hito abierto (etapa actual) por actividad — combinado con los oficios abre
  // buena variedad en el semáforo por actividad que muestra /reportes.
  const COLOR_ABIERTO = {
    "NAI-001-2026": "rojo",
    "NAI-004-2026": "verde",
    "NAI-002-2026": "amarillo",
    "NAI-005-2026": "naranja",
    "NAI-007-2026": "verde",
    "NAI-006-2026": "rojo",
    "NAI-008-2026": "amarillo",
  };

  const hitosDef = [];
  for (const def of actividadesDef) {
    const idxEtapaActual = ORDEN_ETAPA_DOC.indexOf(def.etapa); // -1 si expediente_cierre
    const etapasConcluidas = idxEtapaActual === -1 ? ORDEN_ETAPA_DOC : ORDEN_ETAPA_DOC.slice(0, idxEtapaActual);

    let cursorFecha = def.inicioPlazo;
    let codigo = 1;
    for (const etapaDoc of etapasConcluidas) {
      const dias = DIAS_PLAN[etapaDoc];
      const inicio = cursorFecha;
      const finEsperada = addDays(inicio, Math.ceil((dias * 7) / 5));
      const [dMin, dMax] = DELTA_REAL_CALENDARIO[etapaDoc];
      // Alterna temprano/tarde entre actividades para variar cumplimiento histórico.
      const delta = (hitosDef.length % 2 === 0 ? dMin : dMax);
      const finReal = addDays(finEsperada, delta);
      hitosDef.push({
        no: def.no, codigo: String(codigo++), etapa: etapaDoc,
        inicio, finEsperada, dias, finReal, estado: "concluido",
        cargoResponsable: etapaDoc === "comunicacion_resultados" ? "subjefe" : "auditor",
      });
      cursorFecha = finReal;
    }

    if (idxEtapaActual !== -1) {
      const [inicio, fin] = RANGO[COLOR_ABIERTO[def.no]];
      hitosDef.push({
        no: def.no, codigo: String(codigo++), etapa: def.etapa,
        inicio, finEsperada: fin, dias: DIAS_PLAN[def.etapa], finReal: null, estado: "en_curso",
        cargoResponsable: "auditor",
      });
    }
  }

  await inserta(
    "hitos_cronograma",
    hitosDef.map((h) => ({
      actividad_id: actividadPorNo.get(h.no).id,
      etapa: h.etapa,
      codigo_jerarquico: h.codigo,
      nombre: `Hito ${h.codigo} — ${h.etapa}`,
      fecha_inicio_esperada: h.inicio,
      fecha_fin_esperada: h.finEsperada,
      dias_habiles_esperados: h.dias,
      cargo_responsable: h.cargoResponsable,
      fecha_fin_real: h.finReal,
      estado: h.estado,
    })),
  );
  console.log(`${hitosDef.length} hitos de cronograma creados.`);

  // ── 6. Documentos de actividad + bitácora de movimientos (cuellos de botella) ──
  let docsCreados = 0;
  let movsCreados = 0;
  for (const def of actividadesDef) {
    const actividad = actividadPorNo.get(def.no);
    const idxEtapaActual = ORDEN_ETAPA_DOC.indexOf(def.etapa);
    const etapasDisponibles = idxEtapaActual === -1 ? ORDEN_ETAPA_DOC : ORDEN_ETAPA_DOC.slice(0, idxEtapaActual + 1);
    const nitSubjefe = def.dep === depDAF.id ? "6666-SUBJ" : def.dep === depDAAP.id ? "6667-SUBJ2" : "6668-SUBJ3";
    const nitJefe = def.dep === depDAF.id ? "8888-JEFE" : def.dep === depDAAP.id ? "8889-JEFE2" : "8890-JEFE3";

    for (const [i, etapaDoc] of etapasDisponibles.entries()) {
      const catDoc = catPorEtapa[etapaDoc][docsCreados % catPorEtapa[etapaDoc].length];
      const esUltima = i === etapasDisponibles.length - 1;
      const finalizado = idxEtapaActual === -1 || !esUltima; // todo lo de etapas ya cerradas está finalizado

      const cadenaCargos = etapaDoc === "comunicacion_resultados" ? ["auditor", "subjefe", "jefe"] : ["auditor", "subjefe"];
      const nitPorCargo = { auditor: def.auditor, subjefe: nitSubjefe, jefe: nitJefe };

      const baseIso = def.inicioPlazo;
      let cursorMs = fechaHora(baseIso, 8 + (docsCreados % 4));
      const creadoEn = isoDesdeMs(cursorMs);
      const movimientos = [];
      let cargoActual = "auditor";
      let faseActual = "elaboracion";

      if (finalizado || esUltima) {
        // entrega auditor → subjefe (rápida, mismo día: horas)
        cursorMs += (2 + (docsCreados % 6)) * 3600_000;
        movimientos.push({ de_cargo: "auditor", a_cargo: "subjefe", tipo_evento: "entrega", timestamp: isoDesdeMs(cursorMs), registrado_por_nit: nitPorCargo.auditor });
        cargoActual = "subjefe";
        faseActual = "revision";

        if (docsCreados % 3 === 0) {
          // una corrección de por medio, para variar el ranking por documento/departamento.
          cursorMs += (1 + (docsCreados % 3)) * 86_400_000;
          movimientos.push({ de_cargo: "subjefe", a_cargo: "auditor", tipo_evento: "devolucion_correccion", observacion: "Favor ampliar el sustento documental antes de continuar.", timestamp: isoDesdeMs(cursorMs), registrado_por_nit: nitPorCargo.subjefe });
          cursorMs += (2 + (docsCreados % 4)) * 3600_000;
          movimientos.push({ de_cargo: "auditor", a_cargo: "subjefe", tipo_evento: "entrega", timestamp: isoDesdeMs(cursorMs), registrado_por_nit: nitPorCargo.auditor });
          faseActual = "correccion";
        }

        if (cadenaCargos.length === 3 && finalizado) {
          cursorMs += (4 + (docsCreados % 8)) * 3600_000;
          movimientos.push({ de_cargo: "subjefe", a_cargo: "jefe", tipo_evento: "entrega", timestamp: isoDesdeMs(cursorMs), registrado_por_nit: nitPorCargo.subjefe });
          cargoActual = "jefe";
          cursorMs += (1 + (docsCreados % 3)) * 86_400_000;
          movimientos.push({ de_cargo: "jefe", a_cargo: "jefe", tipo_evento: "aprobacion", timestamp: isoDesdeMs(cursorMs), registrado_por_nit: nitPorCargo.jefe });
          faseActual = "finalizado";
        } else if (finalizado) {
          cursorMs += (3 + (docsCreados % 5)) * 3600_000;
          movimientos.push({ de_cargo: "subjefe", a_cargo: "subjefe", tipo_evento: "aprobacion", timestamp: isoDesdeMs(cursorMs), registrado_por_nit: nitPorCargo.subjefe });
          faseActual = "finalizado";
        }
      }
      // Si no es ni finalizado ni "esUltima" con movimiento (caso no alcanzado aquí), queda en
      // elaboración sin movimientos (documento recién iniciado, todavía con el auditor).

      const { data: doc, error: errDoc } = await sb
        .from("documentos_actividad")
        .insert({
          actividad_id: actividad.id,
          documento_catalogo_id: catDoc.id,
          fase_actual: faseActual,
          cargo_actual_responsable: cargoActual,
          created_at: creadoEn,
        })
        .select()
        .single();
      if (errDoc) throw new Error(`Insert documento_actividad falló: ${errDoc.message}`);
      docsCreados++;

      if (movimientos.length > 0) {
        await inserta("movimientos", movimientos.map((m) => ({ ...m, documento_actividad_id: doc.id })));
        movsCreados += movimientos.length;
      }
    }
  }
  console.log(`${docsCreados} documentos de actividad y ${movsCreados} movimientos de bitácora creados.`);

  // ── 7. Oficios ──
  const oficiosDef = [
    { no: "DAI-DAF-001-2026", actividad: "NAI-001-2026", resp: "4444-AUD4", dest: "Tesorería Nacional", asunto: "Solicitud de información sobre saldos de fondo rotativo", emision: "2026-08-17", envio: "2026-08-17", recepcion: "2026-08-18", plazo: 21, vencimiento: "2026-09-16" },
    { no: "DAI-DAF-002-2026", actividad: "NAI-002-2026", resp: "4445-AUD5", dest: "Dirección de Contabilidad del Estado", asunto: "Requerimiento de conciliaciones bancarias del segundo semestre", emision: "2026-08-01", envio: "2026-08-01", recepcion: "2026-08-04", plazo: 16, vencimiento: "2026-08-25" },
    { no: "DAI-DAF-003-2026", actividad: "NAI-003-2026", resp: "4444-AUD4", dest: "Dirección de Contabilidad del Estado", asunto: "Solicitud de saldos conciliados al cierre del período evaluado", emision: "2026-03-01", envio: "2026-03-01", recepcion: "2026-03-03", plazo: 10, vencimiento: "2026-03-17", noRespuesta: "DCE-045-2026", respuesta: "2026-03-15" },
    { no: "DAI-DAF-004-2026", actividad: "NAI-003-2026", resp: "4444-AUD4", dest: "Tesorería Nacional", asunto: "Requerimiento de listado de cuentas por pagar vencidas", emision: "2026-04-01", envio: "2026-04-01", recepcion: "2026-04-02", plazo: 8, vencimiento: "2026-04-13", noRespuesta: "TN-102-2026", respuesta: "2026-04-20" },
    { no: "DAI-DAAP-001-2026", actividad: "NAI-004-2026", resp: "4446-AUD6", dest: "Dirección de Recursos Humanos", asunto: "Solicitud de expedientes de contratación de la muestra", emision: "2026-09-01", envio: "2026-09-01", recepcion: "2026-09-02", plazo: 17, vencimiento: "2026-09-25" },
    { no: "DAI-DAAP-002-2026", actividad: "NAI-005-2026", resp: "4447-AUD7", dest: "Dirección de Adquisiciones del Estado", asunto: "Requerimiento de expedientes de compra directa", emision: "2026-08-10", envio: "2026-08-10", recepcion: "2026-08-11", plazo: 19, vencimiento: "2026-09-08" },
    { no: "DAI-DAAP-003-2026", actividad: "NAI-006-2026", resp: "4446-AUD6", dest: "Dirección de Bienes del Estado", asunto: "Solicitud de inventario físico valorizado", emision: "2026-06-01", envio: "2026-06-01", recepcion: "2026-06-02", plazo: 10, vencimiento: "2026-06-15", noRespuesta: "DBE-078-2026", respuesta: "2026-06-12" },
    { no: "DAI-DAAP-004-2026", actividad: "NAI-006-2026", resp: "4447-AUD7", dest: "Dirección de Bienes del Estado", asunto: "Notificación de conclusiones preliminares sobre custodia de bienes", emision: "2026-08-01", envio: "2026-08-01", recepcion: "2026-08-03", plazo: 17, vencimiento: "2026-08-25" },
    { no: "DAI-DAE-001-2026", actividad: "NAI-007-2026", resp: "4448-AUD8", dest: "Superintendencia de Administración Tributaria", asunto: "Requerimiento de información sobre el proyecto especial", emision: "2026-09-01", envio: "2026-09-01", recepcion: "2026-09-03", plazo: 17, vencimiento: "2026-09-25" },
    { no: "DAI-DAE-002-2026", actividad: "NAI-008-2026", resp: "4449-AUD9", dest: "Instituto de Fomento Municipal", asunto: "Solicitud de expedientes del proyecto de infraestructura", emision: "2026-08-17", envio: "2026-08-17", recepcion: "2026-08-19", plazo: 21, vencimiento: "2026-09-16" },
    { no: "DAI-DAE-003-2026", actividad: "NAI-008-2026", resp: "4449-AUD9", dest: "Instituto de Fomento Municipal", asunto: "Requerimiento de acta de recepción de obra", emision: "2026-05-01", envio: "2026-05-01", recepcion: "2026-05-02", plazo: 12, vencimiento: "2026-05-18", noRespuesta: "IFM-030-2026", respuesta: "2026-05-25" },
    { no: "DAI-DAE-999-2026", actividad: null, resp: "8890-JEFE3", dest: "Contraloría General de Cuentas", asunto: "Solicitud de aclaración sobre normativa aplicable a procesos especiales", emision: "2026-08-05" },
  ];

  await inserta(
    "oficios",
    oficiosDef.map((o) => ({
      actividad_id: o.actividad ? actividadPorNo.get(o.actividad).id : null,
      no_oficio: o.no,
      fecha_emision: o.emision,
      destinatario: o.dest,
      asunto: o.asunto,
      responsable_elaboracion_nit: o.resp,
      medio_envio: o.envio ? "Correo institucional" : null,
      fecha_envio: o.envio ?? null,
      fecha_recepcion: o.recepcion ?? null,
      plazo_respuesta_dias: o.plazo ?? null,
      fecha_vencimiento: o.vencimiento ?? null,
      no_respuesta: o.noRespuesta ?? null,
      fecha_respuesta: o.respuesta ?? null,
    })),
  );
  console.log(`${oficiosDef.length} oficios creados.`);

  console.log("\nListo. Cuentas de acceso (misma clave para todas):", CLAVE);
  for (const u of usuarios.filter((u) => u.auth)) console.log(`  ${u.correo} — ${u.cargo}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
