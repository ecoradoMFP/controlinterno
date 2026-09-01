import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  calcularColorPorActividad,
  UMBRAL_POR_DEFECTO,
  COLOR_SEMAFORO_LABELS,
  type UmbralSemaforo,
} from "@/lib/semaforo";

/**
 * Job diario de alertas de semáforo (sección 9). No calcula nada que /reportes no calcule ya
 * (misma función `calcularColorPorActividad` de `lib/semaforo.ts`, para que ambos coincidan
 * siempre) — lo que agrega es la parte "activa": persistir una notificación in-app cuando una
 * actividad ENTRA o CAMBIA de color naranja/rojo, dirigida a quien le corresponde (equipo de la
 * actividad, jefatura del departamento, subdirección y Dirección), en vez de depender de que
 * alguien abra el dashboard.
 *
 * Sección 12.2: usa el cliente de service role porque necesita ver las actividades de los 3
 * departamentos para decidir a quién avisar, no el alcance de un usuario autenticado — por eso
 * vive en una Route Handler server-only, nunca en una Server Action que resuelve algo por
 * cuenta de un usuario. Pensado para dispararse vía Vercel Cron (`vercel.json`, diario), y
 * protegido con `CRON_SECRET` — Vercel agrega automáticamente `Authorization: Bearer
 * $CRON_SECRET` a sus propias invocaciones cuando esa variable de entorno existe.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sb = createServiceRoleClient();

  const [
    { data: actividades },
    { data: equipos },
    { data: hitosAbiertos },
    { data: oficiosAbiertos },
    { data: parametros },
    { data: feriadosRows },
    { data: departamentos },
    { data: subdirecciones },
    { data: usuarios },
    { data: notificacionesPrevias },
  ] = await Promise.all([
    sb.from("actividades").select("id, no_nombramiento, departamento_id, auditor_principal_nit"),
    sb.from("actividades_equipo").select("actividad_id, usuario_nit"),
    sb.from("hitos_cronograma").select("actividad_id, fecha_inicio_esperada, fecha_fin_esperada").is("fecha_fin_real", null),
    sb
      .from("oficios")
      .select("actividad_id, fecha_emision, fecha_vencimiento")
      .is("fecha_respuesta", null)
      .not("fecha_vencimiento", "is", null)
      .not("actividad_id", "is", null),
    sb.from("parametros_semaforo").select("*"),
    sb.from("calendario_feriados").select("fecha"),
    sb.from("departamentos").select("id, subdireccion_id"),
    sb.from("subdirecciones").select("id, subdirector_nit"),
    sb.from("usuarios").select("nit, cargo, departamento_id, activo").eq("activo", true),
    sb.from("notificaciones").select("actividad_id, color, usuario_nit"),
  ]);

  const feriados = new Set((feriadosRows ?? []).map((f) => f.fecha));
  const umbralPorAmbito = new Map((parametros ?? []).map((p) => [p.ambito, p as UmbralSemaforo]));
  const umbralHito = umbralPorAmbito.get("hito") ?? UMBRAL_POR_DEFECTO;
  const umbralOficio = umbralPorAmbito.get("oficio") ?? UMBRAL_POR_DEFECTO;
  const hoy = new Date().toISOString().slice(0, 10);

  const colorPorActividad = calcularColorPorActividad(
    hitosAbiertos ?? [],
    oficiosAbiertos ?? [],
    hoy,
    feriados,
    umbralHito,
    umbralOficio,
  );

  // Ya notificados por (actividad, color, destinatario) — no por actividad+color solamente:
  // si alguien se suma al equipo/jefatura mientras el color no cambia, esa persona todavía no
  // tiene ese par en el set y sí debe recibir la alerta, aunque sus compañeros no se renotifiquen.
  const yaNotificado = new Set(
    (notificacionesPrevias ?? []).map((n) => `${n.actividad_id}|${n.color}|${n.usuario_nit}`),
  );

  const subdirectorPorDepartamento = new Map<string, string>();
  for (const d of departamentos ?? []) {
    const sub = (subdirecciones ?? []).find((s) => s.id === d.subdireccion_id);
    if (sub?.subdirector_nit) subdirectorPorDepartamento.set(d.id, sub.subdirector_nit);
  }
  const jefaturaPorDepartamento = new Map<string, string[]>();
  const directores: string[] = [];
  for (const u of usuarios ?? []) {
    if (u.cargo === "director") directores.push(u.nit);
    if ((u.cargo === "jefe" || u.cargo === "subjefe") && u.departamento_id) {
      const lista = jefaturaPorDepartamento.get(u.departamento_id) ?? [];
      lista.push(u.nit);
      jefaturaPorDepartamento.set(u.departamento_id, lista);
    }
  }
  const equipoPorActividad = new Map<string, string[]>();
  for (const eq of equipos ?? []) {
    const lista = equipoPorActividad.get(eq.actividad_id) ?? [];
    lista.push(eq.usuario_nit);
    equipoPorActividad.set(eq.actividad_id, lista);
  }

  const filasNotificacion: { usuario_nit: string; actividad_id: string; color: "naranja" | "rojo"; mensaje: string }[] = [];

  for (const actividad of actividades ?? []) {
    const color = colorPorActividad.get(actividad.id);
    if (color !== "naranja" && color !== "rojo") continue;

    const destinatarios = new Set<string>([
      actividad.auditor_principal_nit,
      ...(equipoPorActividad.get(actividad.id) ?? []),
      ...(jefaturaPorDepartamento.get(actividad.departamento_id) ?? []),
      ...directores,
    ]);
    const subdirector = subdirectorPorDepartamento.get(actividad.departamento_id);
    if (subdirector) destinatarios.add(subdirector);

    const mensaje = `${actividad.no_nombramiento} pasó a "${COLOR_SEMAFORO_LABELS[color]}" en el semáforo.`;
    for (const nit of destinatarios) {
      if (yaNotificado.has(`${actividad.id}|${color}|${nit}`)) continue;
      filasNotificacion.push({ usuario_nit: nit, actividad_id: actividad.id, color, mensaje });
    }
  }

  if (filasNotificacion.length > 0) {
    const { error } = await sb.from("notificaciones").insert(filasNotificacion);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    actividadesEvaluadas: actividades?.length ?? 0,
    actividadesAlertadas: new Set(filasNotificacion.map((f) => f.actividad_id)).size,
    notificacionesInsertadas: filasNotificacion.length,
  });
}
