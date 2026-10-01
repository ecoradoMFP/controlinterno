"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";

const RUTA = "/configuracion/estructura";

function fail(message: string): never {
  redirect(`${RUTA}?error=${encodeURIComponent(message)}`);
}

// Defensa en profundidad: además de RLS (control_total), la acción verifica el permiso.
async function requiereControlTotal() {
  const usuario = await getUsuarioActual();
  if (!usuario || usuario.permiso_sistema !== "control_total") {
    fail("Solo Dirección (control_total) puede editar la estructura organizacional.");
  }
}

export async function agregarUnidad(formData: FormData) {
  await requiereControlTotal();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const padre_id = String(formData.get("padre_id") ?? "") || null;
  if (!nombre) fail("Escribe el nombre de la unidad.");

  const supabase = await createClient();
  const { data: hermanas } = await supabase.from("unidades_ministerio").select("orden").eq("padre_id", padre_id ?? "").order("orden", { ascending: false }).limit(1);
  const { error } = await supabase.from("unidades_ministerio").insert({ nombre, padre_id, orden: (hermanas?.[0]?.orden ?? 0) + 1 });
  if (error) fail(error.code === "23505" ? "Ya existe una unidad con ese nombre." : "No se pudo agregar la unidad.");
  revalidatePath(RUTA);
}

export async function renombrarUnidad(formData: FormData) {
  await requiereControlTotal();
  const id = String(formData.get("id"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) fail("El nombre no puede quedar vacío.");

  const supabase = await createClient();
  const { error } = await supabase.from("unidades_ministerio").update({ nombre }).eq("id", id);
  if (error) fail(error.code === "23505" ? "Ya existe una unidad con ese nombre." : "No se pudo renombrar la unidad.");
  revalidatePath(RUTA);
}

export async function cambiarActivaUnidad(formData: FormData) {
  await requiereControlTotal();
  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";

  const supabase = await createClient();
  const { error } = await supabase.from("unidades_ministerio").update({ activo }).eq("id", id);
  if (error) fail("No se pudo actualizar la unidad.");
  revalidatePath(RUTA);
}
