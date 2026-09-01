"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";

function fail(message: string): never {
  redirect(`/configuracion?error=${encodeURIComponent(message)}`);
}

/**
 * Sección 12.3: defensa en profundidad — además de RLS (`parametros_semaforo_update` /
 * `calendario_feriados_*`, ambas restringidas a `control_total`), esta página y sus Server
 * Actions verifican explícitamente el permiso antes de tocar la base.
 */
async function requiereControlTotal() {
  const usuario = await getUsuarioActual();
  if (!usuario || usuario.permiso_sistema !== "control_total") {
    fail("Solo Dirección (control_total) puede editar la configuración del semáforo.");
  }
}

export async function actualizarUmbral(formData: FormData) {
  await requiereControlTotal();

  const id = String(formData.get("id"));
  const verde = Number(formData.get("umbral_verde_pct"));
  const amarillo = Number(formData.get("umbral_amarillo_pct"));
  const naranja = Number(formData.get("umbral_naranja_pct"));

  if ([verde, amarillo, naranja].some((n) => Number.isNaN(n))) {
    fail("Los tres umbrales deben ser números.");
  }
  if (!(verde > amarillo && amarillo > naranja)) {
    fail("Los umbrales deben cumplir verde > amarillo > naranja.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("parametros_semaforo")
    .update({ umbral_verde_pct: verde, umbral_amarillo_pct: amarillo, umbral_naranja_pct: naranja })
    .eq("id", id);

  if (error) fail("No se pudo actualizar el umbral.");

  revalidatePath("/configuracion");
  redirect("/configuracion");
}

export async function agregarFeriado(formData: FormData) {
  await requiereControlTotal();

  const fecha = String(formData.get("fecha") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();

  if (!fecha || !descripcion) fail("Indica fecha y descripción del feriado.");

  const supabase = await createClient();
  const { error } = await supabase.from("calendario_feriados").insert({ fecha, descripcion });

  if (error) fail("No se pudo agregar el feriado (¿ya existe esa fecha?).");

  revalidatePath("/configuracion");
  redirect("/configuracion");
}

export async function eliminarFeriado(formData: FormData) {
  await requiereControlTotal();

  const fecha = String(formData.get("fecha"));

  const supabase = await createClient();
  const { error } = await supabase.from("calendario_feriados").delete().eq("fecha", fecha);

  if (error) fail("No se pudo eliminar el feriado.");

  revalidatePath("/configuracion");
  redirect("/configuracion");
}
