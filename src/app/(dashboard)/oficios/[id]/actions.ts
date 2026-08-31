"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";

function fail(oficioId: string, tab: string, message: string): never {
  redirect(`/oficios/${oficioId}?tab=${tab}&error=${encodeURIComponent(message)}`);
}

function ok(oficioId: string, tab: string): never {
  revalidatePath(`/oficios/${oficioId}`);
  redirect(`/oficios/${oficioId}?tab=${tab}`);
}

export async function registrarEnvio(formData: FormData) {
  const oficioId = String(formData.get("oficio_id"));
  const fechaEnvio = String(formData.get("fecha_envio") ?? "");
  const medioEnvio = String(formData.get("medio_envio") ?? "").trim() || null;

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(oficioId, "seguimiento", "No tienes permiso para registrar el envío.");
  if (!fechaEnvio) fail(oficioId, "seguimiento", "Indica la fecha de envío.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("oficios")
    .update({ fecha_envio: fechaEnvio, medio_envio: medioEnvio })
    .eq("id", oficioId);

  if (error) fail(oficioId, "seguimiento", "No se pudo registrar el envío.");

  ok(oficioId, "seguimiento");
}

export async function registrarRecepcion(formData: FormData) {
  const oficioId = String(formData.get("oficio_id"));
  const fechaRecepcion = String(formData.get("fecha_recepcion") ?? "");

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(oficioId, "seguimiento", "No tienes permiso para registrar la recepción.");
  if (!fechaRecepcion) fail(oficioId, "seguimiento", "Indica la fecha de recepción.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("oficios")
    .update({ fecha_recepcion: fechaRecepcion })
    .eq("id", oficioId);

  if (error) fail(oficioId, "seguimiento", "No se pudo registrar la recepción.");

  ok(oficioId, "seguimiento");
}

export async function registrarRespuesta(formData: FormData) {
  const oficioId = String(formData.get("oficio_id"));
  const noRespuesta = String(formData.get("no_respuesta") ?? "").trim() || null;
  const fechaRespuesta = String(formData.get("fecha_respuesta") ?? "");
  const observaciones = String(formData.get("observaciones") ?? "").trim() || null;

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(oficioId, "seguimiento", "No tienes permiso para registrar la respuesta.");
  if (!fechaRespuesta) fail(oficioId, "seguimiento", "Indica la fecha de respuesta.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("oficios")
    .update({ no_respuesta: noRespuesta, fecha_respuesta: fechaRespuesta, observaciones })
    .eq("id", oficioId);

  // Sección 12.1: si fecha_respuesta ya estaba registrada, el trigger solo deja corregirla a
  // control_total y exige que `observaciones` documente el cambio — este mismo error cubre
  // ambos casos (permiso insuficiente en RLS o el trigger rechazando la corrección).
  if (error) fail(oficioId, "seguimiento", "No se pudo registrar la respuesta.");

  ok(oficioId, "seguimiento");
}

export async function agregarRevisor(formData: FormData) {
  const oficioId = String(formData.get("oficio_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "").trim();

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(oficioId, "participantes", "No tienes permiso para agregar revisores.");
  if (!usuarioNit) fail(oficioId, "participantes", "Selecciona a un usuario.");

  const supabase = await createClient();
  const { error } = await supabase.from("oficios_revisores").insert({ oficio_id: oficioId, usuario_nit: usuarioNit });

  if (error) fail(oficioId, "participantes", "No se pudo agregar al revisor (¿ya estaba asignado?).");

  ok(oficioId, "participantes");
}

export async function agregarFirmante(formData: FormData) {
  const oficioId = String(formData.get("oficio_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "").trim();

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(oficioId, "participantes", "No tienes permiso para agregar firmantes.");
  if (!usuarioNit) fail(oficioId, "participantes", "Selecciona a un usuario.");

  const supabase = await createClient();
  const { error } = await supabase.from("oficios_firmantes").insert({ oficio_id: oficioId, usuario_nit: usuarioNit });

  if (error) fail(oficioId, "participantes", "No se pudo agregar al firmante (¿ya estaba asignado?).");

  ok(oficioId, "participantes");
}
