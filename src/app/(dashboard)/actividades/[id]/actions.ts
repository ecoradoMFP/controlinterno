"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";

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
  const { error } = await supabase.from("documentos_actividad").insert({
    actividad_id: actividadId,
    documento_catalogo_id: documentoCatalogoId,
    cargo_actual_responsable: cargoActualResponsable as never,
  });

  if (error) fail(actividadId, "documentos", "No se pudo iniciar el documento (¿ya estaba iniciado?).");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=documentos`);
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
