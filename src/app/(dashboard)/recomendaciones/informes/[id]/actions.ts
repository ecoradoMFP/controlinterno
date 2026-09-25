"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeOperarInforme } from "@/lib/auth";
import { deficienciaFormSchema, recomendacionFormSchema } from "@/lib/validations/recomendacion";

function fail(informeId: string, message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/recomendaciones/informes/${informeId}?${params.toString()}`);
}

async function verificarAlcance(informeId: string) {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  // Sección 12.3: defensa en profundidad además de RLS (informes_auditoria_equipo/
  // deficiencias/recomendaciones/seguimientos_recomendacion insert policies).
  if (!(await puedeOperarInforme(usuario, informeId, supabase))) {
    fail(informeId, "No tienes permiso para modificar este informe.");
  }
  return { usuario: usuario!, supabase };
}

export async function agregarMiembroEquipoInforme(formData: FormData) {
  const informeId = String(formData.get("informe_id") ?? "");
  const usuarioNit = String(formData.get("usuario_nit") ?? "");
  if (!informeId || !usuarioNit) fail(informeId, "Falta seleccionar al usuario.");

  const { supabase } = await verificarAlcance(informeId);

  const { error } = await supabase.from("informes_auditoria_equipo").insert({
    informe_id: informeId,
    usuario_nit: usuarioNit,
  });
  if (error) fail(informeId, "No se pudo agregar al equipo.");

  revalidatePath(`/recomendaciones/informes/${informeId}`);
  redirect(`/recomendaciones/informes/${informeId}`);
}

export async function eliminarMiembroEquipoInforme(formData: FormData) {
  const informeId = String(formData.get("informe_id") ?? "");
  const usuarioNit = String(formData.get("usuario_nit") ?? "");
  if (!informeId || !usuarioNit) fail(informeId, "Falta identificar al miembro del equipo.");

  const { supabase } = await verificarAlcance(informeId);

  const { error } = await supabase
    .from("informes_auditoria_equipo")
    .delete()
    .eq("informe_id", informeId)
    .eq("usuario_nit", usuarioNit);
  if (error) fail(informeId, "No se pudo quitar al miembro del equipo.");

  revalidatePath(`/recomendaciones/informes/${informeId}`);
  redirect(`/recomendaciones/informes/${informeId}`);
}

export async function agregarDeficiencia(formData: FormData) {
  const informeId = String(formData.get("informe_id") ?? "");
  if (!informeId) fail(informeId, "Falta identificar el informe.");

  const { usuario, supabase } = await verificarAlcance(informeId);

  const parsed = deficienciaFormSchema.safeParse({
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") ?? undefined,
  });
  if (!parsed.success) fail(informeId, "Revisa el título de la deficiencia.");

  const { count } = await supabase
    .from("deficiencias")
    .select("id", { count: "exact", head: true })
    .eq("informe_id", informeId);

  const { error } = await supabase.from("deficiencias").insert({
    informe_id: informeId,
    numero: (count ?? 0) + 1,
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion || null,
    creado_por_nit: usuario.nit,
  });
  if (error) fail(informeId, "No se pudo agregar la deficiencia.");

  revalidatePath(`/recomendaciones/informes/${informeId}`);
  redirect(`/recomendaciones/informes/${informeId}`);
}

export async function agregarRecomendacion(formData: FormData) {
  const informeId = String(formData.get("informe_id") ?? "");
  const deficienciaId = String(formData.get("deficiencia_id") ?? "");
  if (!informeId || !deficienciaId) fail(informeId, "Falta identificar la deficiencia.");

  const { usuario, supabase } = await verificarAlcance(informeId);

  const parsed = recomendacionFormSchema.safeParse({
    texto: formData.get("texto"),
    responsables: formData.get("responsables") ?? undefined,
    fecha_implementacion: formData.get("fecha_implementacion") ?? undefined,
    estado_inicial: formData.get("estado_inicial") ?? undefined,
  });
  if (!parsed.success) fail(informeId, "Revisa el texto de la recomendación.");

  const { count } = await supabase
    .from("recomendaciones")
    .select("id", { count: "exact", head: true })
    .eq("deficiencia_id", deficienciaId);

  const recomendacionId = crypto.randomUUID();
  const { error } = await supabase.from("recomendaciones").insert({
    id: recomendacionId,
    deficiencia_id: deficienciaId,
    numero: (count ?? 0) + 1,
    texto: parsed.data.texto,
    responsables: parsed.data.responsables || null,
    fecha_implementacion: parsed.data.fecha_implementacion || null,
    creado_por_nit: usuario.nit,
  });
  if (error) fail(informeId, "No se pudo agregar la recomendación.");

  // 1ra etapa de la matriz de DAF: el estado que ya trae la recomendación al informe final se
  // guarda como fila sin documento (numero_seguimiento 0). "Pendiente" es el default de la tabla, no
  // hace falta registrarlo.
  if (parsed.data.estado_inicial !== "pendiente") {
    const { error: errorEstado } = await supabase.from("seguimientos_recomendacion").insert({
      recomendacion_id: recomendacionId,
      documento_id: null,
      // El trigger seguimientos_recomendacion_asignar_numero decide el número real.
      numero_seguimiento: 0,
      estado: parsed.data.estado_inicial,
      registrado_por_nit: usuario.nit,
    });
    if (errorEstado) fail(informeId, "La recomendación se agregó, pero no se pudo registrar su estado inicial.");
  }

  revalidatePath(`/recomendaciones/informes/${informeId}`);
  redirect(`/recomendaciones/informes/${informeId}`);
}
