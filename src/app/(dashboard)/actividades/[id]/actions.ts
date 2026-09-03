"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { SIGUIENTE_ETAPA, ETAPA_ACTIVIDAD_LABELS, type EtapaActividadEnum } from "@/types/domain";

function fail(actividadId: string, tab: string, message: string): never {
  redirect(`/actividades/${actividadId}?tab=${tab}&error=${encodeURIComponent(message)}`);
}

export async function agregarMiembroEquipo(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "").trim();
  const rolEnEquipo = String(formData.get("rol_en_equipo") ?? "").trim() || null;

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(actividadId, "equipo", "No tienes permiso para modificar el equipo.");
  if (!usuarioNit) fail(actividadId, "equipo", "Selecciona a un usuario.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("actividades_equipo")
    .insert({ actividad_id: actividadId, usuario_nit: usuarioNit, rol_en_equipo: rolEnEquipo });

  if (error) fail(actividadId, "equipo", "No se pudo agregar al equipo (¿ya estaba asignado?).");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=equipo`);
}

export async function agregarDocumentoActividad(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const documentoCatalogoId = String(formData.get("documento_catalogo_id") ?? "");
  const cargoActualResponsable = String(formData.get("cargo_actual_responsable") ?? "auditor");

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(actividadId, "documentos", "No tienes permiso para agregar documentos.");
  if (!documentoCatalogoId) fail(actividadId, "documentos", "Selecciona un documento del catálogo.");

  const supabase = await createClient();

  // No se puede iniciar un documento de una etapa que la actividad todavía no alcanzó (ej.
  // un documento de Ejecución mientras la actividad sigue en Planificación) — reforzado
  // también en la base de datos (política RLS de documentos_actividad), esto solo da un
  // mensaje más claro que el genérico de RLS.
  const [{ data: actividad }, { data: documentoCatalogo }] = await Promise.all([
    supabase.from("actividades").select("etapa_actual").eq("id", actividadId).maybeSingle(),
    supabase.from("documentos_catalogo").select("etapa, nombre").eq("id", documentoCatalogoId).maybeSingle(),
  ]);
  if (actividad && documentoCatalogo && documentoCatalogo.etapa !== actividad.etapa_actual) {
    fail(
      actividadId,
      "documentos",
      `"${documentoCatalogo.nombre}" pertenece a la etapa "${ETAPA_ACTIVIDAD_LABELS[documentoCatalogo.etapa as EtapaActividadEnum]}" — cierra la etapa actual antes de iniciarlo.`,
    );
  }

  const { error } = await supabase.from("documentos_actividad").insert({
    actividad_id: actividadId,
    documento_catalogo_id: documentoCatalogoId,
    cargo_actual_responsable: cargoActualResponsable as never,
  });

  if (error) fail(actividadId, "documentos", "No se pudo iniciar el documento (¿ya estaba iniciado?).");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=documentos`);
}

export async function agregarHito(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const codigoJerarquico = String(formData.get("codigo_jerarquico") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const etapa = String(formData.get("etapa") ?? "");
  const cargoResponsable = String(formData.get("cargo_responsable") ?? "");
  const fechaInicioEsperada = String(formData.get("fecha_inicio_esperada") ?? "");
  const fechaFinEsperada = String(formData.get("fecha_fin_esperada") ?? "");
  const diasHabilesEsperados = Number(formData.get("dias_habiles_esperados"));
  const documentoCatalogoId = String(formData.get("documento_catalogo_id") ?? "") || null;

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(actividadId, "cronograma", "No tienes permiso para agregar hitos.");
  if (!codigoJerarquico || !nombre || !etapa || !cargoResponsable || !fechaInicioEsperada || !fechaFinEsperada) {
    fail(actividadId, "cronograma", "Completa todos los campos requeridos del hito.");
  }
  if (fechaFinEsperada < fechaInicioEsperada) {
    fail(actividadId, "cronograma", "La fecha de fin esperado no puede ser anterior al inicio esperado.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("hitos_cronograma").insert({
    actividad_id: actividadId,
    codigo_jerarquico: codigoJerarquico,
    nombre,
    etapa: etapa as never,
    cargo_responsable: cargoResponsable as never,
    fecha_inicio_esperada: fechaInicioEsperada,
    fecha_fin_esperada: fechaFinEsperada,
    dias_habiles_esperados: diasHabilesEsperados,
    documento_catalogo_id: documentoCatalogoId,
  });

  if (error) fail(actividadId, "cronograma", "No se pudo agregar el hito (¿código ya usado en esta actividad?).");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=cronograma`);
}

export async function concluirHito(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const hitoId = String(formData.get("hito_id"));
  const fechaFinReal = String(formData.get("fecha_fin_real") ?? "");

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(actividadId, "cronograma", "No tienes permiso para concluir hitos.");
  if (!fechaFinReal) fail(actividadId, "cronograma", "Indica la fecha real de conclusión.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("hitos_cronograma")
    .update({ fecha_fin_real: fechaFinReal, estado: "concluido" })
    .eq("id", hitoId);

  if (error) fail(actividadId, "cronograma", "No se pudo marcar el hito como concluido.");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=cronograma`);
}

export async function registrarMovimiento(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const documentoActividadId = String(formData.get("documento_actividad_id"));
  const deCargo = String(formData.get("de_cargo") ?? "") || null;
  const aCargo = String(formData.get("a_cargo") ?? "");
  const tipoEvento = String(formData.get("tipo_evento") ?? "");
  const nuevaFase = String(formData.get("nueva_fase") ?? "");
  const observacion = String(formData.get("observacion") ?? "").trim() || null;

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) {
    fail(actividadId, "documentos", "No tienes permiso para registrar movimientos.");
  }
  if (!aCargo || !tipoEvento) fail(actividadId, "documentos", "Completa el cargo destino y el tipo de evento.");

  const supabase = await createClient();

  // El registro y el avance de fase del documento son dos escrituras separadas por diseño:
  // `movimientos` es la bitácora inmutable (sección 4.8), `documentos_actividad.fase_actual`
  // es el estado mutable que resume "dónde va" ahora mismo. Si el avance de fase falla, no
  // dejamos un movimiento huérfano registrado sin reflejo en el estado actual.
  const { error: movError } = await supabase.from("movimientos").insert({
    documento_actividad_id: documentoActividadId,
    de_cargo: deCargo as never,
    a_cargo: aCargo as never,
    tipo_evento: tipoEvento as never,
    observacion,
    registrado_por_nit: usuario.nit,
  });

  if (movError) fail(actividadId, "documentos", "No se pudo registrar el movimiento.");

  if (nuevaFase) {
    const { error: faseError } = await supabase
      .from("documentos_actividad")
      .update({ fase_actual: nuevaFase as never, cargo_actual_responsable: aCargo as never })
      .eq("id", documentoActividadId);

    if (faseError) fail(actividadId, "documentos", "El movimiento se registró, pero no se pudo actualizar la fase.");
  }

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=documentos`);
}

export async function cerrarEtapa(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) fail(actividadId, "documentos", "No tienes permiso para cerrar la etapa.");

  const supabase = await createClient();

  const { data: actividad } = await supabase
    .from("actividades")
    .select("etapa_actual")
    .eq("id", actividadId)
    .maybeSingle();
  if (!actividad) fail(actividadId, "documentos", "No se encontró la actividad.");

  const etapaCerrada = actividad.etapa_actual;
  const etapaSiguiente = SIGUIENTE_ETAPA[etapaCerrada];
  if (!etapaSiguiente) fail(actividadId, "documentos", "El expediente ya está en Expediente / Cierre.");

  // El UPDATE es la escritura que de verdad cuenta — el trigger `validar_avance_etapa` (sección
  // 12.1/12.3, defensa en profundidad) es quien valida que no queden documentos ni hitos de la
  // etapa actual sin terminar, y que el equipo haya confirmado recibido/declaración si aplica.
  // El historial se inserta después, solo si el avance fue real: al revés dejaría constancia de
  // un cierre que en realidad no ocurrió.
  const { error: updateError } = await supabase
    .from("actividades")
    .update({ etapa_actual: etapaSiguiente })
    .eq("id", actividadId);

  if (updateError) fail(actividadId, "documentos", updateError.message);

  const { error: historialError } = await supabase.from("actividades_etapa_historial").insert({
    actividad_id: actividadId,
    etapa_cerrada: etapaCerrada,
    etapa_siguiente: etapaSiguiente,
    cerrado_por_nit: usuario.nit,
  });

  if (historialError) {
    fail(actividadId, "documentos", "La etapa se cerró, pero no se pudo registrar en el historial.");
  }

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=documentos`);
}

export async function actualizarConfirmacionEquipo(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "");
  const campo = String(formData.get("campo") ?? "");
  const fecha = String(formData.get("fecha") ?? "");

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) fail(actividadId, "equipo", "No tienes permiso para confirmar al equipo.");
  if ((campo !== "recibido" && campo !== "declaracion") || !fecha) {
    fail(actividadId, "equipo", "Indica la fecha.");
  }

  const supabase = await createClient();
  const cambios = campo === "recibido" ? { fecha_recibido: fecha } : { fecha_declaracion_independencia: fecha };
  const { error } = await supabase
    .from("actividades_equipo")
    .update(cambios)
    .eq("actividad_id", actividadId)
    .eq("usuario_nit", usuarioNit);

  if (error) fail(actividadId, "equipo", "No se pudo guardar la confirmación.");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=equipo`);
}
