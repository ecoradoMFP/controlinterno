"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeGestionarCapacitacionDe } from "@/lib/auth";
import { capacitacionFormSchema } from "@/lib/validations/capacitacion";

function fail(personalId: string, message: string, fieldErrors?: Record<string, string>): never {
  const params = new URLSearchParams({ error: message });
  if (fieldErrors) params.set("fieldErrors", JSON.stringify(fieldErrors));
  redirect(`/capacitaciones/${personalId}?${params.toString()}`);
}

async function verificarAlcance(
  personalId: string,
  usuario: Awaited<ReturnType<typeof getUsuarioActual>>,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data: persona } = await supabase.from("usuarios").select("nit, departamento_id").eq("nit", personalId).maybeSingle();
  if (!persona) fail(personalId, "No se encontró a la persona.");

  if (!(await puedeGestionarCapacitacionDe(usuario, persona, supabase))) {
    fail(personalId, "No tienes permiso para registrar capacitaciones de esta persona.");
  }
}

export async function registrarCapacitacion(formData: FormData) {
  const personalId = String(formData.get("personal_id") ?? "");
  if (!personalId) fail(personalId, "Falta identificar a la persona.");

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  // Sección 12.3: defensa en profundidad además de RLS (`capacitaciones_insert`).
  await verificarAlcance(personalId, usuario, supabase);

  const parsed = capacitacionFormSchema.safeParse({
    nombre: formData.get("nombre"),
    institucion: formData.get("institucion"),
    horas: formData.get("horas"),
    fecha: formData.get("fecha"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    fail(personalId, "Revisa los campos marcados.", fieldErrors);
  }

  const { error } = await supabase.from("capacitaciones").insert({
    usuario_nit: personalId,
    registrado_por_nit: usuario!.nit,
    ...parsed.data,
  });

  if (error) fail(personalId, "No se pudo registrar la capacitación.");

  revalidatePath(`/capacitaciones/${personalId}`);
  revalidatePath("/capacitaciones");
  redirect(`/capacitaciones/${personalId}`);
}

export async function eliminarCapacitacion(formData: FormData) {
  const personalId = String(formData.get("personal_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!personalId || !id) fail(personalId, "Falta identificar el registro.");

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  await verificarAlcance(personalId, usuario, supabase);

  const { error } = await supabase.from("capacitaciones").delete().eq("id", id);
  if (error) fail(personalId, "No se pudo eliminar la capacitación.");

  revalidatePath(`/capacitaciones/${personalId}`);
  revalidatePath("/capacitaciones");
  redirect(`/capacitaciones/${personalId}`);
}
