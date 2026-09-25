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
  // Sección 12.3: defensa en profundidad además de RLS (`informes_auditoria_insert`).
  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) {
    fail("No tienes permiso para crear informes de auditoría.");
  }

  const campo = (nombre: string) => formData.get(nombre) ?? undefined;
  const parsed = informeFormSchema.safeParse({
    no_nombramiento: campo("no_nombramiento"),
    cai: campo("cai"),
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
    fail("Revisa los campos marcados.", fieldErrors);
  }

  const { departamento_id, dependencia_auditada, ...opcionales } = parsed.data;

  const supabase = await createClient();

  // Mismo patrón que crearActividad: se genera el id aquí y no se encadena `.select()` tras el
  // insert, porque `informes_auditoria_select` decide visibilidad re-consultando la tabla y la
  // fila recién insertada no le es visible todavía dentro del mismo statement (RETURNING
  // fallaría con "violates row-level security policy" aunque el INSERT en sí sea válido).
  const id = crypto.randomUUID();

  // Los campos opcionales llegan como "" desde el formulario: se guardan como null.
  const { error } = await supabase.from("informes_auditoria").insert({
    id,
    departamento_id,
    dependencia_auditada,
    ...Object.fromEntries(Object.entries(opcionales).map(([k, v]) => [k, v || null])),
    creado_por_nit: usuario!.nit,
  });


  if (error) {
    fail("No se pudo crear el informe. Verifica los datos e intenta de nuevo.");
  }

  revalidatePath("/recomendaciones");
  redirect(`/recomendaciones/informes/${id}`);
}
