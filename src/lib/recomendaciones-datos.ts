import type { createClient } from "@/lib/supabase/server";
import { type EtapaRecomendacion, estaVencida, hoyGuatemala, pasoDelCai, ubicarRecomendacion, type PasoCai } from "@/lib/recomendaciones";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Usado tanto por la bandeja principal como por los paneles de "en seguimiento" e "histórico":
// una sola consulta, un solo cálculo de a qué panel pertenece cada recomendación.
const CAMPOS = `id, numero, texto, fecha_implementacion, estado_actual,
   deficiencias(numero, titulo, informes_auditoria(id, no_nombramiento, cai, dependencia_auditada, anio_ejecucion, fecha_informe_final, departamento_id, departamentos(nombre))),
   seguimientos_recomendacion(numero_seguimiento, estado, documentos_seguimiento(no_documento, fecha_documento, no_nombramiento, fecha_nombramiento))`;

export type FilaRecomendacion = Awaited<ReturnType<typeof cargarRecomendaciones>>[number];

/**
 * Todas las recomendaciones visibles para el usuario actual (RLS decide el alcance) con los
 * campos derivados que usan los 3 paneles: a qué panel pertenece (bucket/anio, ver
 * ubicarRecomendacion), si está vencida y su último documento de seguimiento (emitido o no, para
 * mostrarlo en la fila aunque todavía no mueva de panel).
 */
export async function cargarRecomendaciones(supabase: SupabaseServerClient) {
  const hoy = hoyGuatemala();
  const { data } = await supabase.from("recomendaciones").select(CAMPOS);

  return (data ?? []).flatMap((r) => {
    const informe = r.deficiencias?.informes_auditoria;
    if (!r.deficiencias || !informe) return [];
    const ultimo = [...r.seguimientos_recomendacion]
      .filter((s) => s.documentos_seguimiento)
      .sort((a, b) => b.numero_seguimiento - a.numero_seguimiento)[0];
    const { bucket, anio: anioBucket } = ubicarRecomendacion(r.seguimientos_recomendacion, hoy);
    // Una "activa" con un seguimiento ya registrado en un documento sin emitir está evaluada: solo
    // falta emitir el informe que la formaliza.
    const evaluadaSinEmitir = r.seguimientos_recomendacion.some(
      (s) => s.numero_seguimiento > 0 && s.documentos_seguimiento && !s.documentos_seguimiento.no_documento,
    );
    const etapa: EtapaRecomendacion =
      bucket === "atendida" ? "atendida" : bucket === "en_seguimiento" ? "en_seguimiento" : evaluadaSinEmitir ? "evaluada" : "por_evaluar";
    return [
      {
        ...r,
        deficiencia: r.deficiencias,
        informe,
        anio: informe.anio_ejecucion ?? (informe.fecha_informe_final ? Number(informe.fecha_informe_final.slice(0, 4)) : null),
        vencida: estaVencida(r.estado_actual, r.fecha_implementacion, hoy),
        ultimoDocumento: ultimo?.documentos_seguimiento ?? null,
        seguimientos: r.seguimientos_recomendacion.filter((s) => s.numero_seguimiento > 0).length,
        bucket,
        etapa,
        anioBucket,
      },
    ];
  });
}

export type PasoDocumento = "evaluar" | "emitir" | "sag" | "completo";

/**
 * Nombramientos de seguimiento visibles para el usuario actual, cada uno con el paso del ciclo en
 * que va (mismo criterio que la pantalla del documento): evaluar recomendaciones -> emitir el
 * informe -> cargarlo al SAG-UDAI -> completo. Sirve para la lista de nombramientos y para el
 * aviso de "por completar" en la bandeja.
 */
export async function cargarDocumentosSeguimiento(supabase: SupabaseServerClient) {
  const [{ data: documentos }, { data: evaluaciones }] = await Promise.all([
    supabase
      .from("documentos_seguimiento")
      .select(
        `id, no_nombramiento, fecha_nombramiento, no_documento, fecha_documento, fecha_carga_sag_udai, tipo_documento, departamentos(nombre),
         documentos_seguimiento_auditores(usuarios(nombre)),
         documentos_seguimiento_informes(informes_auditoria(id, cai, no_nombramiento, dependencia_auditada, deficiencias(recomendaciones(id, estado_actual))))`,
      ),
    supabase.from("seguimientos_recomendacion").select("documento_id, recomendacion_id").not("documento_id", "is", null),
  ]);

  const evaluadasPorDocumento = new Map<string, Set<string>>();
  for (const e of evaluaciones ?? []) {
    if (!e.documento_id) continue;
    const set = evaluadasPorDocumento.get(e.documento_id) ?? new Set<string>();
    set.add(e.recomendacion_id);
    evaluadasPorDocumento.set(e.documento_id, set);
  }

  return (documentos ?? []).map((d) => {
    const informes = d.documentos_seguimiento_informes.flatMap((c) => (c.informes_auditoria ? [c.informes_auditoria] : []));
    const recomendaciones = informes.flatMap((i) => i.deficiencias.flatMap((def) => def.recomendaciones));
    const evaluadas = evaluadasPorDocumento.get(d.id) ?? new Set<string>();
    const emitido = !!d.no_documento;
    // Emitido: la cédula está cerrada, ya no "faltan" recomendaciones.
    const porEvaluar = emitido ? 0 : recomendaciones.filter((r) => r.estado_actual !== "cumplida" && !evaluadas.has(r.id)).length;
    const paso: PasoDocumento = !emitido
      ? porEvaluar > 0 || evaluadas.size === 0
        ? "evaluar"
        : "emitir"
      : d.fecha_carga_sag_udai
        ? "completo"
        : "sag";
    return {
      ...d,
      informes,
      auditores: d.documentos_seguimiento_auditores.flatMap((a) => (a.usuarios ? [a.usuarios.nombre] : [])),
      evaluadas: evaluadas.size,
      porEvaluar,
      paso,
    };
  });
}

/**
 * Cédula de un nombramiento/informe de seguimiento: una fila por recomendación de los informes
 * que cubre, con su evaluación en ESTE documento (si ya la tiene) y los seguimientos anteriores
 * ya emitidos. Mientras el documento no se emita (la emisión cierra la cédula) incluye también las
 * recomendaciones abiertas que faltan por evaluar. La comparten la pantalla y la exportación a
 * Word para que nunca difieran. RLS decide qué recomendaciones ve el usuario.
 */
export async function cargarCedulaDocumento(supabase: SupabaseServerClient, id: string) {
  const { data: documento } = await supabase
    .from("documentos_seguimiento")
    .select(
      `*, departamentos(nombre), documentos_seguimiento_auditores(usuario_nit, usuarios(nombre, puesto, cargo)),
       documentos_seguimiento_informes(informes_auditoria(id, no_nombramiento, cai, tipo_auditoria, dependencia_auditada,
         periodo_auditado_inicio, periodo_auditado_fin, fecha_notificacion,
         deficiencias(numero, titulo, descripcion, recomendaciones(id, numero, texto, responsables, estado_actual))))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!documento) return null;

  const informes = documento.documentos_seguimiento_informes
    .flatMap((c) => (c.informes_auditoria ? [c.informes_auditoria] : []))
    .sort((a, b) => (a.cai ?? a.no_nombramiento ?? "").localeCompare(b.cai ?? b.no_nombramiento ?? ""));
  const idsRecomendaciones = informes.flatMap((i) => i.deficiencias.flatMap((d) => d.recomendaciones.map((r) => r.id)));

  const { data: seguimientos } = await supabase
    .from("seguimientos_recomendacion")
    .select(
      "recomendacion_id, documento_id, numero_seguimiento, estado, acciones_responsables, comentario_auditoria, documentos_seguimiento(no_documento, fecha_documento)",
    )
    .in("recomendacion_id", idsRecomendaciones);

  const emitido = !!documento.no_documento;
  const filas = informes
    .flatMap((informe) =>
      [...informe.deficiencias]
        .sort((a, b) => a.numero - b.numero)
        .flatMap((deficiencia) =>
          [...deficiencia.recomendaciones]
            .sort((a, b) => a.numero - b.numero)
            .map((recomendacion) => {
              const propios = (seguimientos ?? []).filter((s) => s.recomendacion_id === recomendacion.id);
              const evaluacion = propios.find((s) => s.documento_id === id);
              const anteriores = propios
                .filter(
                  (s) =>
                    s.documento_id !== id &&
                    s.numero_seguimiento > 0 &&
                    s.documentos_seguimiento?.no_documento &&
                    (!evaluacion || s.numero_seguimiento < evaluacion.numero_seguimiento),
                )
                .sort((a, b) => a.numero_seguimiento - b.numero_seguimiento);
              return { informe, deficiencia, recomendacion, evaluacion, anteriores };
            }),
        ),
    )
    .filter((f) => f.evaluacion || (!emitido && f.recomendacion.estado_actual !== "cumplida"));

  return { documento, informes, filas, emitido };
}

/**
 * Qué falta en cada CAI (por id de informe), para mostrarlo en la bandeja: toma el nombramiento
 * de seguimiento más antiguo sin completar que lo cubre; sin él, mira si hay recomendaciones activas.
 */
export async function cargarFlujoPorCai(supabase: SupabaseServerClient, filas: FilaRecomendacion[]) {
  const documentos = await cargarDocumentosSeguimiento(supabase);
  const flujo = new Map<string, { paso: PasoCai; documentoId: string | null }>();

  const informes = new Set(filas.map((f) => f.informe.id));
  for (const id of informes) {
    const enCurso = documentos
      .filter((d) => d.paso !== "completo" && d.informes.some((i) => i.id === id))
      .sort((a, b) => (a.fecha_nombramiento ?? "").localeCompare(b.fecha_nombramiento ?? ""))[0];
    const paso = pasoDelCai({
      tieneRecomendaciones: true,
      hayActivas: filas.some((f) => f.informe.id === id && f.bucket === "activa"),
      pasoDocumento: enCurso && enCurso.paso !== "completo" ? enCurso.paso : null,
    });
    flujo.set(id, { paso, documentoId: enCurso?.id ?? null });
  }
  return flujo;
}

export type CaiResumen = Awaited<ReturnType<typeof cargarCais>>[number];

/**
 * Un resumen por CAI visible para el usuario (RLS decide cuáles), incluidos los que aún no tienen
 * recomendaciones: sus recomendaciones, qué falta (paso) y los conteos para la vista "Por CAI".
 */
export async function cargarCais(supabase: SupabaseServerClient) {
  const [{ data: informes }, filas, documentos] = await Promise.all([
    supabase
      .from("informes_auditoria")
      .select(
        "id, cai, no_nombramiento, dependencia_auditada, tipo_auditoria, departamento_id, anio_ejecucion, fecha_informe_final, departamentos(nombre)",
      ),
    cargarRecomendaciones(supabase),
    cargarDocumentosSeguimiento(supabase),
  ]);

  return (informes ?? []).map((informe) => {
    const recs = filas.filter((f) => f.informe.id === informe.id);
    const enCurso = documentos
      .filter((d) => d.paso !== "completo" && d.informes.some((i) => i.id === informe.id))
      .sort((a, b) => (a.fecha_nombramiento ?? "").localeCompare(b.fecha_nombramiento ?? ""))[0];
    const paso = pasoDelCai({
      tieneRecomendaciones: recs.length > 0,
      hayActivas: recs.some((f) => f.bucket === "activa"),
      pasoDocumento: enCurso && enCurso.paso !== "completo" ? enCurso.paso : null,
    });
    const anio = informe.anio_ejecucion ?? (informe.fecha_informe_final ? Number(informe.fecha_informe_final.slice(0, 4)) : null);
    return {
      informe,
      recomendaciones: recs,
      paso,
      anio,
      vencidas: recs.filter((f) => f.vencida).length,
      porEstado: {
        pendiente: recs.filter((f) => f.estado_actual === "pendiente").length,
        en_proceso: recs.filter((f) => f.estado_actual === "en_proceso").length,
        no_cumplida: recs.filter((f) => f.estado_actual === "no_cumplida").length,
        cumplida: recs.filter((f) => f.estado_actual === "cumplida").length,
      },
    };
  });
}
