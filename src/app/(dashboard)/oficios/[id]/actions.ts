"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeCorregirHechoConsumado, puedeEscribir } from "@/lib/auth";
import type { Database } from "@/types/database";

function fail(oficioId: string, tab: string, message: string): never {
  redirect(`/oficios/${oficioId}?tab=${tab}&error=${encodeURIComponent(message)}`);
}

function ok(oficioId: string, tab: string): never {
  revalidatePath(`/oficios/${oficioId}`);
  redirect(`/oficios/${oficioId}?tab=${tab}`);
}

type CambiosOficio = Database["public"]["Tables"]["oficios"]["Update"];

const fechaDMA = (iso: string) => iso.split("-").reverse().join("/");

type CampoFecha = "fecha_envio" | "fecha_recepcion" | "fecha_respuesta";
const ETIQUETA: Record<CampoFecha, string> = {
  fecha_envio: "envío",
  fecha_recepcion: "recepción",
  fecha_respuesta: "respuesta",
};

/**
 * Registra (o, si ya estaba, corrige) una fecha del seguimiento del oficio. Una fecha ya registrada
 * solo la corrige control total y con motivo: el trigger `oficios_proteger_hechos_consumados`
 * exige que cambien las observaciones, así que el motivo se AGREGA a las que ya había, con la
 * fecha anterior y la nueva, sin borrar nada.
 */
async function registrarFecha(formData: FormData, campo: CampoFecha, extra: CambiosOficio) {
  const oficioId = String(formData.get("oficio_id"));
  const nueva = String(formData.get(campo) ?? "");
  const motivo = String(formData.get("motivo_correccion") ?? "").trim();
  const etiqueta = ETIQUETA[campo];

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(oficioId, "seguimiento", `No tiene permiso para registrar la ${etiqueta}.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nueva)) fail(oficioId, "seguimiento", `Indique la fecha de ${etiqueta}.`);

  const supabase = await createClient();
  const { data: actual } = await supabase.from("oficios").select(`${campo}, observaciones`).eq("id", oficioId).maybeSingle();
  if (!actual) fail(oficioId, "seguimiento", "No se encontró el oficio.");
  const anterior = (actual as Record<string, string | null>)[campo];

  const cambios: CambiosOficio = { ...extra, [campo]: nueva };
  if (anterior) {
    // Defensa en profundidad (sección 12.3): misma regla que el trigger.
    if (!puedeCorregirHechoConsumado(usuario)) {
      fail(oficioId, "seguimiento", `La ${etiqueta} ya fue registrada; solo Dirección puede corregirla.`);
    }
    if (motivo.length < 10) fail(oficioId, "seguimiento", "Escriba el motivo de la corrección (al menos 10 caracteres).");
    const nota = `Corrección de la fecha de ${etiqueta} (${fechaDMA(anterior)} → ${fechaDMA(nueva)}): ${motivo}`;
    cambios.observaciones = [actual.observaciones, nota].filter(Boolean).join("\n");
  }

  const { error } = await supabase.from("oficios").update(cambios).eq("id", oficioId);
  if (error) fail(oficioId, "seguimiento", `No se pudo registrar la ${etiqueta}.`);

  ok(oficioId, "seguimiento");
}

export async function registrarEnvio(formData: FormData) {
  await registrarFecha(formData, "fecha_envio", {
    medio_envio: String(formData.get("medio_envio") ?? "").trim() || null,
  });
}

export async function registrarRecepcion(formData: FormData) {
  await registrarFecha(formData, "fecha_recepcion", {});
}

export async function registrarRespuesta(formData: FormData) {
  const extra: CambiosOficio = {
    no_respuesta: String(formData.get("no_respuesta") ?? "").trim() || null,
  };
  // Al registrarla por primera vez se pueden anotar observaciones; en una corrección, el motivo
  // se agrega solo (ver `registrarFecha`).
  if (formData.has("observaciones")) extra.observaciones = String(formData.get("observaciones")).trim() || null;
  await registrarFecha(formData, "fecha_respuesta", extra);
}

export async function agregarRevisor(formData: FormData) {
  const oficioId = String(formData.get("oficio_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "").trim();

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(oficioId, "participantes", "No tiene permiso para agregar revisores.");
  if (!usuarioNit) fail(oficioId, "participantes", "Seleccione a un usuario.");

  const supabase = await createClient();
  const { error } = await supabase.from("oficios_revisores").insert({ oficio_id: oficioId, usuario_nit: usuarioNit });

  if (error) fail(oficioId, "participantes", "No se pudo agregar al revisor (¿ya estaba asignado?).");

  ok(oficioId, "participantes");
}

export async function agregarFirmante(formData: FormData) {
  const oficioId = String(formData.get("oficio_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "").trim();

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(oficioId, "participantes", "No tiene permiso para agregar firmantes.");
  if (!usuarioNit) fail(oficioId, "participantes", "Seleccione a un usuario.");

  const supabase = await createClient();
  const { error } = await supabase.from("oficios_firmantes").insert({ oficio_id: oficioId, usuario_nit: usuarioNit });

  if (error) fail(oficioId, "participantes", "No se pudo agregar al firmante (¿ya estaba asignado?).");

  ok(oficioId, "participantes");
}
