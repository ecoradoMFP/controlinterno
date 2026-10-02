"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeOperarInforme } from "@/lib/auth";
import { deficienciaFormSchema, edicionRecomendacionSchema, recomendacionFormSchema } from "@/lib/validations/recomendacion";

function fail(informeId: string, message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/recomendaciones/informes/${informeId}?${params.toString()}`);
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

  revalidatePath(`/recomendaciones/informes/${informeId}`);
  redirect(`/recomendaciones/informes/${informeId}`);
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

  revalidatePath(`/recomendaciones/informes/${informeId}`);
  redirect(`/recomendaciones/informes/${informeId}`);
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

  revalidatePath(`/recomendaciones/informes/${informeId}`);
  redirect(`/recomendaciones/informes/${informeId}`);
}

export async function agregarRecomendacion(formData: FormData) {
  const informeId = String(formData.get("informe_id") ?? "");
  const deficienciaId = String(formData.get("deficiencia_id") ?? "");
  if (!informeId || !deficienciaId) fail(informeId, "Falta identificar la deficiencia.");

  const { usuario, supabase } = await verificarAlcance(informeId);

  const parsed = recomendacionFormSchema.safeParse({
    texto: formData.get("texto"),
    responsables: formData.get("responsables") ?? undefined,
    fecha_implementacion: formData.get("fecha_implementacion") ?? undefined,
  });
  if (!parsed.success) fail(informeId, parsed.error.issues[0]?.message ?? "Revisa el texto de la recomendación.");

  // Cada deficiencia de un CAI lleva una sola recomendación (se cierra una a una).
  const { count: vigentes } = await supabase
    .from("recomendaciones")
    .select("id", { count: "exact", head: true })
    .eq("deficiencia_id", deficienciaId);
  if ((vigentes ?? 0) > 0) fail(informeId, "Esta deficiencia ya tiene su recomendación.");

  // Siguiente número entre las recomendaciones vigentes (las eliminadas ya no se ven ni cuentan).
  const { data: ultima } = await supabase
    .from("recomendaciones")
    .select("numero")
    .eq("deficiencia_id", deficienciaId)
    .order("numero", { ascending: false })
    .limit(1);

  const { error } = await supabase.from("recomendaciones").insert({
    deficiencia_id: deficienciaId,
    numero: (ultima?.[0]?.numero ?? 0) + 1,
    texto: parsed.data.texto,
    responsables: parsed.data.responsables || null,
    fecha_implementacion: parsed.data.fecha_implementacion,
    creado_por_nit: usuario.nit,
  });
  if (error) fail(informeId, "No se pudo agregar la recomendación.");

  revalidatePath(`/recomendaciones/informes/${informeId}`);
  redirect(`/recomendaciones/informes/${informeId}`);
}

// Corregir un error de captura. El trigger de la base exige el motivo, rechaza el cambio si la
// recomendación ya tiene seguimientos evaluados y guarda el valor anterior en el historial.
export async function editarRecomendacion(formData: FormData) {
  const informeId = String(formData.get("informe_id") ?? "");
  const recomendacionId = String(formData.get("recomendacion_id") ?? "");
  if (!informeId || !recomendacionId) fail(informeId, "Falta identificar la recomendación.");

  const { supabase } = await verificarAlcance(informeId);

  const parsed = edicionRecomendacionSchema.safeParse({
    texto: formData.get("texto"),
    responsables: formData.get("responsables") ?? undefined,
    fecha_implementacion: formData.get("fecha_implementacion") ?? undefined,
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) fail(informeId, parsed.error.issues[0]?.message ?? "Revisa los campos de la recomendación.");

  const { error } = await supabase
    .from("recomendaciones")
    .update({
      texto: parsed.data.texto,
      responsables: parsed.data.responsables || null,
      fecha_implementacion: parsed.data.fecha_implementacion || null,
      motivo_ultimo_cambio: parsed.data.motivo,
    })
    .eq("id", recomendacionId);
  if (error) fail(informeId, mensajeDeCambio(error.message, "No se pudo guardar la corrección."));

  revalidatePath(`/recomendaciones/informes/${informeId}`);
  redirect(`/recomendaciones/informes/${informeId}`);
}

// "Eliminar" = anular: la recomendación deja de verse pero queda en el historial con su motivo.
export async function eliminarRecomendacion(formData: FormData) {
  const informeId = String(formData.get("informe_id") ?? "");
  const recomendacionId = String(formData.get("recomendacion_id") ?? "");
  if (!informeId || !recomendacionId) fail(informeId, "Falta identificar la recomendación.");

  const { supabase } = await verificarAlcance(informeId);

  const motivo = String(formData.get("motivo") ?? "").trim();
  if (motivo.length < 5) fail(informeId, "Explica brevemente el motivo (mínimo 5 caracteres).");

  const { error } = await supabase.rpc("anular_recomendacion", { p_id: recomendacionId, p_motivo: motivo });
  if (error) fail(informeId, mensajeDeCambio(error.message, "No se pudo eliminar la recomendación."));

  revalidatePath(`/recomendaciones/informes/${informeId}`);
  revalidatePath("/recomendaciones");
  redirect(`/recomendaciones/informes/${informeId}`);
}

// Los mensajes de las reglas de la base (motivo, seguimientos evaluados, permisos) ya están
// redactados para el usuario; cualquier otro error se reemplaza por uno genérico.
function mensajeDeCambio(mensaje: string, generico: string) {
  return /motivo del cambio|seguimientos evaluados|No tienes permiso/.test(mensaje) ? mensaje : generico;
}
