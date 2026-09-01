"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function marcarNotificacionLeida(formData: FormData) {
  const id = String(formData.get("id"));

  const supabase = await createClient();
  // Sin verificación adicional de propietario: RLS (notificaciones_update) ya solo permite
  // actualizar filas donde usuario_nit = authz.nit_actual().
  await supabase.from("notificaciones").update({ leido: true }).eq("id", id);

  revalidatePath("/notificaciones");
}

export async function marcarTodasLeidas() {
  const supabase = await createClient();
  await supabase.from("notificaciones").update({ leido: true }).eq("leido", false);
  revalidatePath("/notificaciones");
}
