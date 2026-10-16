"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeCorregirHechoConsumado, puedeEscribir } from "@/lib/auth";
import { errorAccion as fail, type ResultadoAccion } from "@/lib/actions/resultado";
import type { Database } from "@/types/database";

function ok(oficioId: string) {
  revalidatePath(`/oficios/${oficioId}`);
}

type CambiosOficio = Database["public"]["Tables"]["oficios"]["Update"];

const fechaDMA = (iso: string) => iso.split("-").reverse().join("/");

type CampoFecha = "fecha_envio" | "fecha_recepcion" | "fecha_respuesta";
const ETIQUETA: Record<CampoFecha, string> = {
  fecha_envio: "envío",
  fecha_recepcion: "recepción",
  fecha_respuesta: "respuesta",
};

async function registrarFecha(formData: FormData, campo: CampoFecha, extra: CambiosOficio): Promise<ResultadoAccion> {
  const oficioId = String(formData.get("oficio_id"));
  const nueva = String(formData.get(campo) ?? "");
  const motivo = String(formData.get("motivo_correccion") ?? "").trim();
  const etiqueta = ETIQUETA[campo];

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) return fail(`No tiene permiso para registrar la ${etiqueta}.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nueva)) return fail(`Indique la fecha de ${etiqueta}.`);

  const supabase = await createClient();
  const { data: actual } = await supabase.from("oficios").select(`${campo}, observaciones`).eq("id", oficioId).maybeSingle();
  if (!actual) return fail("No se encontró el oficio.");
  const anterior = (actual as Record<string, string | null>)[campo];

  const cambios: CambiosOficio = { ...extra, [campo]: nueva };
  if (anterior) {
    if (!puedeCorregirHechoConsumado(usuario)) {
      return fail(`La ${etiqueta} ya fue registrada; solo Dirección puede corregirla.`);
    }
    if (motivo.length < 10) return fail("Escriba el motivo de la corrección (al menos 10 caracteres).");
    const nota = `Corrección de la fecha de ${etiqueta} (${fechaDMA(anterior)} → ${fechaDMA(nueva)}): ${motivo}`;
    cambios.observaciones = [actual.observaciones, nota].filter(Boolean).join("\n");
  }

  const { error } = await supabase.from("oficios").update(cambios).eq("id", oficioId);
  if (error) return fail(`No se pudo registrar la ${etiqueta}.`);

  ok(oficioId);
}

export async function registrarEnvio(formData: FormData): Promise<ResultadoAccion> {
  return registrarFecha(formData, "fecha_envio", {
    medio_envio: String(formData.get("medio_envio") ?? "").trim() || null,
  });
}

export async function registrarRecepcion(formData: FormData): Promise<ResultadoAccion> {
  return registrarFecha(formData, "fecha_recepcion", {});
}

export async function registrarRespuesta(formData: FormData): Promise<ResultadoAccion> {
  const extra: CambiosOficio = {
    no_respuesta: String(formData.get("no_respuesta") ?? "").trim() || null,
  };
  if (formData.has("observaciones")) extra.observaciones = String(formData.get("observaciones")).trim() || null;
  return registrarFecha(formData, "fecha_respuesta", extra);
}

export async function agregarRevisor(formData: FormData): Promise<ResultadoAccion> {
  const oficioId = String(formData.get("oficio_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "").trim();

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) return fail("No tiene permiso para agregar revisores.");
  if (!usuarioNit) return fail("Seleccione a un usuario.");

  const supabase = await createClient();
  const { error } = await supabase.from("oficios_revisores").insert({ oficio_id: oficioId, usuario_nit: usuarioNit });

  if (error) return fail("No se pudo agregar al revisor (¿ya estaba asignado?).");

  ok(oficioId);
}

export async function agregarFirmante(formData: FormData): Promise<ResultadoAccion> {
  const oficioId = String(formData.get("oficio_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "").trim();

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) return fail("No tiene permiso para agregar firmantes.");
  if (!usuarioNit) return fail("Seleccione a un usuario.");

  const supabase = await createClient();
  const { error } = await supabase.from("oficios_firmantes").insert({ oficio_id: oficioId, usuario_nit: usuarioNit });

  if (error) return fail("No se pudo agregar al firmante (¿ya estaba asignado?).");

  ok(oficioId);
}
