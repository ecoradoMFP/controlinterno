"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import {
  actividadFormSchema,
  parseExpedientesRelacionados,
} from "@/lib/validations/actividad";

function fail(message: string, fieldErrors?: Record<string, string>): never {
  const params = new URLSearchParams({ error: message });
  if (fieldErrors) params.set("fieldErrors", JSON.stringify(fieldErrors));
  redirect(`/actividades/nueva?${params.toString()}`);
}

export async function crearActividad(formData: FormData) {
  // Sección 12.3: defensa en profundidad — se valida permiso_sistema aquí además de RLS,
  // porque esta Server Function es alcanzable por POST directo, no solo desde el formulario.
  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) {
    fail("No tienes permiso para crear actividades.");
  }

  const parsed = actividadFormSchema.safeParse({
    no_nombramiento: formData.get("no_nombramiento"),
    departamento_id: formData.get("departamento_id"),
    auditor_principal_nit: formData.get("auditor_principal_nit"),
    dependencia_auditada: formData.get("dependencia_auditada"),
    tipo_auditoria: formData.get("tipo_auditoria"),
    periodo_evaluado_inicio: formData.get("periodo_evaluado_inicio"),
    periodo_evaluado_fin: formData.get("periodo_evaluado_fin"),
    fecha_inicio_plazo: formData.get("fecha_inicio_plazo"),
    fecha_notificacion: formData.get("fecha_notificacion"),
    expedientes_relacionados: formData.get("expedientes_relacionados") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    fail("Revisa los campos marcados.", fieldErrors);
  }

  const { expedientes_relacionados, ...rest } = parsed.data;

  const supabase = await createClient();

  // El id se genera aquí (no se deja el default `gen_random_uuid()` de la columna) para no
  // encadenar `.select().single()` tras el insert: `actividades_select` decide visibilidad
  // consultando `actividades` de nuevo por id, y esa fila recién insertada, dentro del mismo
  // statement, no le es visible todavía a esa subconsulta — Postgres entonces trata el RETURNING
  // como si la policy de SELECT hubiera fallado y aborta el INSERT con "violates row-level
  // security policy", aunque el INSERT en sí (WITH CHECK) era válido. Sin RETURNING no hay
  // problema, así que ya sabemos el id de antemano y no necesitamos leerlo de vuelta.
  const id = crypto.randomUUID();

  const { error } = await supabase.from("actividades").insert({
    id,
    ...rest,
    expedientes_relacionados: parseExpedientesRelacionados(expedientes_relacionados),
  });

  if (error) {
    // Los mensajes crudos de Postgres (constraint names, etc.) no se muestran tal cual a un
    // usuario final; RLS/CHECK ya hicieron su trabajo, aquí solo se informa que falló.
    fail("No se pudo crear la actividad. Verifica los datos e intenta de nuevo.");
  }

  revalidatePath("/actividades");
  redirect(`/actividades/${id}`);
}
