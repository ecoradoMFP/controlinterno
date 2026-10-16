"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { informeFormSchema } from "@/lib/validations/recomendacion";

function fail(message: string, fieldErrors?: Record<string, string>): never {
  const params = new URLSearchParams({ error: message });
  if (fieldErrors) params.set("fieldErrors", JSON.stringify(fieldErrors));
  redirect(`/recomendaciones/informes/nuevo?${params.toString()}`);
}

export async function crearInforme(formData: FormData) {
  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) {
    fail("No tiene permiso para crear informes de auditoría.");
  }

  const campo = (nombre: string) => formData.get(nombre) ?? undefined;
  const parsed = informeFormSchema.safeParse({
    no_nombramiento: campo("no_nombramiento"),
    cai: campo("cai"),
    anio_cai: campo("anio_cai"),
    departamento_id: formData.get("departamento_id"),
    dependencia_auditada: formData.get("dependencia_auditada"),
    tipo_auditoria: campo("tipo_auditoria"),
    periodo_auditado_inicio: campo("periodo_auditado_inicio"),
    periodo_auditado_fin: campo("periodo_auditado_fin"),
    fecha_nombramiento: campo("fecha_nombramiento"),
    fecha_informe_final: campo("fecha_informe_final"),
    fecha_notificacion: campo("fecha_notificacion"),
    supervisor_nit: campo("supervisor_nit"),
    coordinador_nit: campo("coordinador_nit"),
    riesgo: campo("riesgo"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    fail("Revise los campos marcados.", fieldErrors);
  }

  const { departamento_id, dependencia_auditada, ...opcionales } = parsed.data;

  const supabase = await createClient();

  const id = crypto.randomUUID();

  const { error } = await supabase.from("informes_auditoria").insert({
    id,
    departamento_id,
    dependencia_auditada,
    ...Object.fromEntries(Object.entries(opcionales).map(([k, v]) => [k, v || null])),
    creado_por_nit: usuario!.nit,
  });

  if (error) {
    fail(
      error.code === "23505"
        ? `Ya existe el CAI ${parsed.data.cai} del año ${parsed.data.anio_cai}.`
        : "No se pudo crear el informe. Verifique los datos e intente de nuevo.",
      error.code === "23505" ? { cai: "Ya registrado en ese año" } : undefined,
    );
  }

  revalidatePath("/recomendaciones");
  redirect(`/recomendaciones/informes/${id}`);
}
