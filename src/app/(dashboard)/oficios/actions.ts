"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { oficioFormSchema } from "@/lib/validations/oficio";

function fail(message: string, fieldErrors?: Record<string, string>): never {
  const params = new URLSearchParams({ error: message });
  if (fieldErrors) params.set("fieldErrors", JSON.stringify(fieldErrors));
  redirect(`/oficios/nueva?${params.toString()}`);
}

export async function crearOficio(formData: FormData) {
  // Sección 12.3: defensa en profundidad además de RLS, alcanzable por POST directo.
  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) {
    fail("No tienes permiso para crear oficios.");
  }

  const parsed = oficioFormSchema.safeParse({
    no_oficio: formData.get("no_oficio"),
    actividad_id: formData.get("actividad_id") ?? undefined,
    destinatario: formData.get("destinatario"),
    puesto_destinatario: formData.get("puesto_destinatario") ?? undefined,
    asunto: formData.get("asunto"),
    responsable_elaboracion_nit: formData.get("responsable_elaboracion_nit"),
    fecha_emision: formData.get("fecha_emision"),
    medio_envio: formData.get("medio_envio") ?? undefined,
    plazo_respuesta_dias: formData.get("plazo_respuesta_dias") ?? undefined,
    fecha_vencimiento: formData.get("fecha_vencimiento") ?? undefined,
    observaciones: formData.get("observaciones") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    fail("Revisa los campos marcados.", fieldErrors);
  }

  const { actividad_id, fecha_vencimiento, ...rest } = parsed.data;

  const supabase = await createClient();

  // Mismo patrón que crearActividad: id generado aquí y sin `.select()` tras el insert, para
  // no disparar el chequeo de la policy de SELECT (`oficios_select` → `authz.puede_ver_oficio`,
  // que también se auto-consulta por id) contra una fila que, dentro del mismo statement,
  // todavía no le es visible a esa subconsulta.
  const id = crypto.randomUUID();

  const { error } = await supabase.from("oficios").insert({
    id,
    ...rest,
    actividad_id: actividad_id || null,
    fecha_vencimiento: fecha_vencimiento || null,
  });

  if (error) {
    fail("No se pudo crear el oficio. Verifica los datos e intenta de nuevo.");
  }

  revalidatePath("/oficios");
  redirect(`/oficios/${id}`);
}
