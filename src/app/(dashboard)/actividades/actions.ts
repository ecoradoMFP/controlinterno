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
  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) {
    fail("No tiene permiso para crear auditorías.");
  }

  const parsed = actividadFormSchema.safeParse({
    cai: formData.get("cai"),
    anio_cai: formData.get("anio_cai"),
    no_nombramiento: formData.get("no_nombramiento"),
    departamento_id: formData.get("departamento_id"),
    auditor_principal_nit: formData.get("auditor_principal_nit"),
    dependencia_auditada: formData.get("dependencia_auditada"),
    tipo_auditoria: formData.get("tipo_auditoria"),
    area: formData.get("area") ?? undefined,
    fecha_emision_nombramiento: formData.get("fecha_emision_nombramiento") ?? undefined,
    fecha_notificacion_equipo: formData.get("fecha_notificacion_equipo") ?? undefined,
    fecha_notificacion_dependencia: formData.get("fecha_notificacion_dependencia") ?? undefined,
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
    fail("Revise los campos marcados.", fieldErrors);
  }

  const { expedientes_relacionados, ...rest } = parsed.data;

  const supabase = await createClient();

  // Sin .select() después del insert: la policy de SELECT aún no ve la fila nueva.
  const id = crypto.randomUUID();

  const { error } = await supabase.from("actividades").insert({
    id,
    ...rest,
    expedientes_relacionados: parseExpedientesRelacionados(expedientes_relacionados),
  });

  if (error?.code === "23505") {
    if (error.message.includes("actividades_cai_anio_idx")) {
      fail(`Ya existe una auditoría con el CAI ${rest.cai}-${rest.anio_cai}.`, { cai: "CAI ya registrado en ese año" });
    }
    fail("Ya existe una auditoría con ese número de nombramiento.", { no_nombramiento: "Número ya registrado" });
  }
  if (error) {
    fail("No se pudo crear la auditoría. Verifique los datos e intente de nuevo.");
  }

  await supabase.from("actividades_equipo").insert({
    actividad_id: id,
    usuario_nit: rest.auditor_principal_nit,
  });

  revalidatePath("/actividades");
  redirect(`/actividades/${id}`);
}
