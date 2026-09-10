"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { informeFormSchema } from "@/lib/validations/recomendacion";

function fail(message: string, fieldErrors?: Record<string, string>): never {
  const params = new URLSearchParams({ error: message });
  if (fieldErrors) params.set("fieldErrors", JSON.stringify(fieldErrors));
  redirect(`/recomendaciones/nuevo?${params.toString()}`);
}

export async function crearInforme(formData: FormData) {
  // Sección 12.3: defensa en profundidad además de RLS (`informes_auditoria_insert`).
  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) {
    fail("No tienes permiso para crear informes de auditoría.");
  }

  const parsed = informeFormSchema.safeParse({
    no_nombramiento: formData.get("no_nombramiento"),
    cai: formData.get("cai") ?? undefined,
    departamento_id: formData.get("departamento_id"),
    dependencia_auditada: formData.get("dependencia_auditada"),
    periodo_auditado_inicio: formData.get("periodo_auditado_inicio"),
    periodo_auditado_fin: formData.get("periodo_auditado_fin"),
    fecha: formData.get("fecha"),
    fecha_informe_final: formData.get("fecha_informe_final") ?? undefined,
    supervisor_nit: formData.get("supervisor_nit") ?? undefined,
    coordinador_nit: formData.get("coordinador_nit") ?? undefined,
    riesgo: formData.get("riesgo") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    fail("Revisa los campos marcados.", fieldErrors);
  }

  const { cai, fecha_informe_final, supervisor_nit, coordinador_nit, riesgo, ...rest } = parsed.data;

  const supabase = await createClient();

  // Mismo patrón que crearActividad: se genera el id aquí y no se encadena `.select()` tras el
  // insert, porque `informes_auditoria_select` decide visibilidad re-consultando la tabla y la
  // fila recién insertada no le es visible todavía dentro del mismo statement (RETURNING
  // fallaría con "violates row-level security policy" aunque el INSERT en sí sea válido).
  const id = crypto.randomUUID();

  const { error } = await supabase.from("informes_auditoria").insert({
    id,
    ...rest,
    cai: cai || null,
    fecha_informe_final: fecha_informe_final || null,
    supervisor_nit: supervisor_nit || null,
    coordinador_nit: coordinador_nit || null,
    riesgo: riesgo || null,
    creado_por_nit: usuario!.nit,
  });

  if (error) {
    fail("No se pudo crear el informe. Verifica los datos e intenta de nuevo.");
  }

  revalidatePath("/recomendaciones");
  redirect(`/recomendaciones/${id}`);
}
