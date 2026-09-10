"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeOperarInforme } from "@/lib/auth";
import {
  deficienciaFormSchema,
  recomendacionFormSchema,
  seguimientoFormSchema,
} from "@/lib/validations/recomendacion";

function fail(informeId: string, message: string, fieldErrors?: Record<string, string>): never {
  const params = new URLSearchParams({ error: message });
  if (fieldErrors) params.set("fieldErrors", JSON.stringify(fieldErrors));
  redirect(`/recomendaciones/${informeId}?${params.toString()}`);
}

async function verificarAlcance(informeId: string) {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  // Sección 12.3: defensa en profundidad además de RLS (informes_auditoria_equipo/
  // deficiencias/recomendaciones/seguimientos_recomendacion insert policies).
  if (!(await puedeOperarInforme(usuario, informeId, supabase))) {
    fail(informeId, "No tienes permiso para modificar este informe.");
  }
  return { usuario: usuario!, supabase };
}

export async function agregarMiembroEquipoInforme(formData: FormData) {
  const informeId = String(formData.get("informe_id") ?? "");
  const usuarioNit = String(formData.get("usuario_nit") ?? "");
  if (!informeId || !usuarioNit) fail(informeId, "Falta seleccionar al usuario.");

  const { supabase } = await verificarAlcance(informeId);

  const { error } = await supabase.from("informes_auditoria_equipo").insert({
    informe_id: informeId,
    usuario_nit: usuarioNit,
  });
  if (error) fail(informeId, "No se pudo agregar al equipo.");

  revalidatePath(`/recomendaciones/${informeId}`);
  redirect(`/recomendaciones/${informeId}`);
}

export async function eliminarMiembroEquipoInforme(formData: FormData) {
  const informeId = String(formData.get("informe_id") ?? "");
  const usuarioNit = String(formData.get("usuario_nit") ?? "");
  if (!informeId || !usuarioNit) fail(informeId, "Falta identificar al miembro del equipo.");

  const { supabase } = await verificarAlcance(informeId);

  const { error } = await supabase
    .from("informes_auditoria_equipo")
    .delete()
    .eq("informe_id", informeId)
    .eq("usuario_nit", usuarioNit);
  if (error) fail(informeId, "No se pudo quitar al miembro del equipo.");

  revalidatePath(`/recomendaciones/${informeId}`);
  redirect(`/recomendaciones/${informeId}`);
}

export async function agregarDeficiencia(formData: FormData) {
  const informeId = String(formData.get("informe_id") ?? "");
  if (!informeId) fail(informeId, "Falta identificar el informe.");

  const { usuario, supabase } = await verificarAlcance(informeId);

  const parsed = deficienciaFormSchema.safeParse({
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") ?? undefined,
  });
  if (!parsed.success) fail(informeId, "Revisa el título de la deficiencia.");

  const { count } = await supabase
    .from("deficiencias")
    .select("id", { count: "exact", head: true })
    .eq("informe_id", informeId);

  const { error } = await supabase.from("deficiencias").insert({
    informe_id: informeId,
    numero: (count ?? 0) + 1,
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion || null,
    creado_por_nit: usuario.nit,
  });
  if (error) fail(informeId, "No se pudo agregar la deficiencia.");

  revalidatePath(`/recomendaciones/${informeId}`);
  redirect(`/recomendaciones/${informeId}`);
}

export async function agregarRecomendacion(formData: FormData) {
  const informeId = String(formData.get("informe_id") ?? "");
  const deficienciaId = String(formData.get("deficiencia_id") ?? "");
  if (!informeId || !deficienciaId) fail(informeId, "Falta identificar la deficiencia.");

  const { usuario, supabase } = await verificarAlcance(informeId);

  const parsed = recomendacionFormSchema.safeParse({
    texto: formData.get("texto"),
    fecha_implementacion: formData.get("fecha_implementacion") ?? undefined,
  });
  if (!parsed.success) fail(informeId, "Revisa el texto de la recomendación.");

  const { count } = await supabase
    .from("recomendaciones")
    .select("id", { count: "exact", head: true })
    .eq("deficiencia_id", deficienciaId);

  const { error } = await supabase.from("recomendaciones").insert({
    deficiencia_id: deficienciaId,
    numero: (count ?? 0) + 1,
    texto: parsed.data.texto,
    fecha_implementacion: parsed.data.fecha_implementacion || null,
    creado_por_nit: usuario.nit,
  });
  if (error) fail(informeId, "No se pudo agregar la recomendación.");

  revalidatePath(`/recomendaciones/${informeId}`);
  redirect(`/recomendaciones/${informeId}`);
}

export async function registrarSeguimiento(formData: FormData) {
  const informeId = String(formData.get("informe_id") ?? "");
  const recomendacionId = String(formData.get("recomendacion_id") ?? "");
  if (!informeId || !recomendacionId) fail(informeId, "Falta identificar la recomendación.");

  const { usuario, supabase } = await verificarAlcance(informeId);

  const parsed = seguimientoFormSchema.safeParse({
    no_informe_seguimiento: formData.get("no_informe_seguimiento"),
    fecha: formData.get("fecha"),
    estado: formData.get("estado"),
    comentario: formData.get("comentario") ?? undefined,
  });
  if (!parsed.success) fail(informeId, "Revisa los campos del seguimiento.");

  const { count } = await supabase
    .from("seguimientos_recomendacion")
    .select("id", { count: "exact", head: true })
    .eq("recomendacion_id", recomendacionId);

  const { error } = await supabase.from("seguimientos_recomendacion").insert({
    recomendacion_id: recomendacionId,
    numero_seguimiento: (count ?? 0) + 1,
    no_informe_seguimiento: parsed.data.no_informe_seguimiento,
    fecha: parsed.data.fecha,
    estado: parsed.data.estado,
    comentario: parsed.data.comentario || null,
    registrado_por_nit: usuario.nit,
  });
  if (error) fail(informeId, "No se pudo registrar el seguimiento.");

  revalidatePath(`/recomendaciones/${informeId}`);
  redirect(`/recomendaciones/${informeId}`);
}
