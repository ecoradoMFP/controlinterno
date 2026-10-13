"use server";

import { revalidatePath } from "next/cache";
import { errorAccion as fail, type ResultadoAccion } from "@/lib/actions/resultado";
import { createClient } from "@/lib/supabase/server";
import { departamentosParaNombrarSeguimiento, getUsuarioActual, puedeOperarInforme } from "@/lib/auth";
import {
  deficienciaConRecomendacionSchema,
  deficienciaFormSchema,
  edicionDeficienciaSchema,
  edicionRecomendacionSchema,
  recomendacionFormSchema,
} from "@/lib/validations/recomendacion";

// Estas acciones se usan con `FormAccion`: no redirigen, así la página del informe se actualiza en
// su lugar sin saltar arriba. Ver lib/actions/resultado.ts.

async function verificarAlcance(informeId: string) {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  // Sección 12.3: defensa en profundidad además de RLS (informes_auditoria_equipo/
  // deficiencias/recomendaciones/seguimientos_recomendacion insert policies).
  if (!(await puedeOperarInforme(usuario, informeId, supabase))) {
    return fail("No tiene permiso para modificar este informe.");
  }
  // Un CAI bloqueado ya no admite cambios de captura (la base de datos también lo exige).
  const { data: informe } = await supabase.from("informes_auditoria").select("bloqueado_en").eq("id", informeId).maybeSingle();
  if (informe?.bloqueado_en) {
    return fail("El CAI está bloqueado: ya no se pueden agregar ni modificar deficiencias, recomendaciones ni el equipo.");
  }
  return { usuario: usuario!, supabase };
}

// Cerrar la captura del CAI. Lo hace quien puede operar el informe; desbloquear es de la jefatura.
export async function bloquearInforme(formData: FormData): Promise<ResultadoAccion> {
  const informeId = String(formData.get("informe_id") ?? "");
  if (!informeId) return fail("Falta identificar el informe.");
  const alcance = await verificarAlcance(informeId);
  if ("error" in alcance) return alcance;
  const { supabase } = alcance;

  // El trigger informes_auditoria_bloqueo asigna quién y cuándo.
  const { error } = await supabase.from("informes_auditoria").update({ bloqueado_en: new Date().toISOString() }).eq("id", informeId);
  if (error) return fail("No se pudo bloquear el CAI.");

  revalidatePath("/recomendaciones", "layout");
}

export async function desbloquearInforme(formData: FormData): Promise<ResultadoAccion> {
  const informeId = String(formData.get("informe_id") ?? "");
  if (!informeId) return fail("Falta identificar el informe.");
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  const { data: informe } = await supabase.from("informes_auditoria").select("departamento_id").eq("id", informeId).maybeSingle();
  const gestionables = await departamentosParaNombrarSeguimiento(usuario, supabase);
  if (!informe || !gestionables.includes(informe.departamento_id)) return fail("Solo la jefatura puede desbloquear un CAI.");

  const { error } = await supabase.from("informes_auditoria").update({ bloqueado_en: null }).eq("id", informeId);
  if (error) return fail("No se pudo desbloquear el CAI.");

  revalidatePath("/recomendaciones", "layout");
}

// Corregir un error de captura de la deficiencia. El trigger exige el motivo, rechaza el cambio si
// alguna de sus recomendaciones ya tiene seguimientos evaluados y guarda el valor anterior.
export async function editarDeficiencia(formData: FormData): Promise<ResultadoAccion> {
  const informeId = String(formData.get("informe_id") ?? "");
  const deficienciaId = String(formData.get("deficiencia_id") ?? "");
  if (!informeId || !deficienciaId) return fail("Falta identificar la deficiencia.");

  const alcance = await verificarAlcance(informeId);
  if ("error" in alcance) return alcance;
  const { supabase } = alcance;

  const parsed = edicionDeficienciaSchema.safeParse({
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") ?? undefined,
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Revise los campos de la deficiencia.");

  const { error } = await supabase
    .from("deficiencias")
    .update({
      titulo: parsed.data.titulo,
      descripcion: parsed.data.descripcion || null,
      motivo_ultimo_cambio: parsed.data.motivo,
    })
    .eq("id", deficienciaId);
  if (error) return fail(mensajeDeCambio(error.message, "No se pudo guardar la corrección."));

  revalidatePath(`/recomendaciones/informes/${informeId}`);
}

export async function agregarMiembroEquipoInforme(formData: FormData): Promise<ResultadoAccion> {
  const informeId = String(formData.get("informe_id") ?? "");
  const usuarioNit = String(formData.get("usuario_nit") ?? "");
  if (!informeId || !usuarioNit) return fail("Falta seleccionar al usuario.");

  const alcance = await verificarAlcance(informeId);
  if ("error" in alcance) return alcance;
  const { supabase } = alcance;

  const { error } = await supabase.from("informes_auditoria_equipo").insert({
    informe_id: informeId,
    usuario_nit: usuarioNit,
  });
  if (error) return fail("No se pudo agregar al equipo.");

  revalidatePath(`/recomendaciones/informes/${informeId}`);
}

export async function eliminarMiembroEquipoInforme(formData: FormData): Promise<ResultadoAccion> {
  const informeId = String(formData.get("informe_id") ?? "");
  const usuarioNit = String(formData.get("usuario_nit") ?? "");
  if (!informeId || !usuarioNit) return fail("Falta identificar al miembro del equipo.");

  const alcance = await verificarAlcance(informeId);
  if ("error" in alcance) return alcance;
  const { supabase } = alcance;

  const { error } = await supabase
    .from("informes_auditoria_equipo")
    .delete()
    .eq("informe_id", informeId)
    .eq("usuario_nit", usuarioNit);
  if (error) return fail("No se pudo quitar al miembro del equipo.");

  revalidatePath(`/recomendaciones/informes/${informeId}`);
}

export async function agregarDeficiencia(formData: FormData): Promise<ResultadoAccion> {
  const informeId = String(formData.get("informe_id") ?? "");
  if (!informeId) return fail("Falta identificar el informe.");

  const alcance = await verificarAlcance(informeId);
  if ("error" in alcance) return alcance;
  const { usuario, supabase } = alcance;

  const parsed = deficienciaFormSchema.safeParse({
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") ?? undefined,
  });
  if (!parsed.success) return fail("Revise el título de la deficiencia.");

  const { data: ultima } = await supabase
    .from("deficiencias")
    .select("numero")
    .eq("informe_id", informeId)
    .order("numero", { ascending: false })
    .limit(1);

  const { error } = await supabase.from("deficiencias").insert({
    informe_id: informeId,
    numero: (ultima?.[0]?.numero ?? 0) + 1,
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion || null,
    creado_por_nit: usuario.nit,
  });
  if (error) return fail("No se pudo agregar la deficiencia.");

  revalidatePath(`/recomendaciones/informes/${informeId}`);
}

// Cada deficiencia de un CAI lleva UNA recomendación: se capturan juntas, en un solo paso.
export async function agregarDeficienciaConRecomendacion(formData: FormData): Promise<ResultadoAccion> {
  const informeId = String(formData.get("informe_id") ?? "");
  if (!informeId) return fail("Falta identificar el informe.");

  const alcance = await verificarAlcance(informeId);
  if ("error" in alcance) return alcance;
  const { usuario, supabase } = alcance;

  const parsed = deficienciaConRecomendacionSchema.safeParse({
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") ?? undefined,
    texto: formData.get("texto"),
    responsables: formData.get("responsables") ?? undefined,
    fecha_implementacion: formData.get("fecha_implementacion") ?? undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Revise los campos de la deficiencia.");

  // Siguiente número entre las deficiencias vigentes (las eliminadas ya no se ven ni cuentan).
  const { data: ultima } = await supabase
    .from("deficiencias")
    .select("numero")
    .eq("informe_id", informeId)
    .order("numero", { ascending: false })
    .limit(1);

  const deficienciaId = crypto.randomUUID();
  const { error: errorDef } = await supabase.from("deficiencias").insert({
    id: deficienciaId,
    informe_id: informeId,
    numero: (ultima?.[0]?.numero ?? 0) + 1,
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion || null,
    creado_por_nit: usuario.nit,
  });
  if (errorDef) return fail("No se pudo agregar la deficiencia.");

  const { error: errorRec } = await supabase.from("recomendaciones").insert({
    deficiencia_id: deficienciaId,
    numero: 1,
    texto: parsed.data.texto,
    responsables: parsed.data.responsables || null,
    fecha_implementacion: parsed.data.fecha_implementacion,
    creado_por_nit: usuario.nit,
  });
  // La deficiencia no se puede borrar: si falla la recomendación queda visible con su propio
  // formulario para volver a capturarla.
  if (errorRec) return fail("La deficiencia se guardó, pero no su recomendación: captúrela en la deficiencia.");

  revalidatePath(`/recomendaciones/informes/${informeId}`);
}

export async function agregarRecomendacion(formData: FormData): Promise<ResultadoAccion> {
  const informeId = String(formData.get("informe_id") ?? "");
  const deficienciaId = String(formData.get("deficiencia_id") ?? "");
  if (!informeId || !deficienciaId) return fail("Falta identificar la deficiencia.");

  const alcance = await verificarAlcance(informeId);
  if ("error" in alcance) return alcance;
  const { usuario, supabase } = alcance;

  const parsed = recomendacionFormSchema.safeParse({
    texto: formData.get("texto"),
    responsables: formData.get("responsables") ?? undefined,
    fecha_implementacion: formData.get("fecha_implementacion") ?? undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Revise el texto de la recomendación.");

  // Cada deficiencia de un CAI lleva una sola recomendación (se cierra una a una).
  const { count: vigentes } = await supabase
    .from("recomendaciones")
    .select("id", { count: "exact", head: true })
    .eq("deficiencia_id", deficienciaId);
  if ((vigentes ?? 0) > 0) return fail("Esta deficiencia ya tiene su recomendación.");

  // Siguiente número entre las recomendaciones vigentes (las eliminadas ya no se ven ni cuentan).
  const { data: ultima } = await supabase
    .from("recomendaciones")
    .select("numero")
    .eq("deficiencia_id", deficienciaId)
    .order("numero", { ascending: false })
    .limit(1);

  const { error } = await supabase.from("recomendaciones").insert({
    deficiencia_id: deficienciaId,
    numero: (ultima?.[0]?.numero ?? 0) + 1,
    texto: parsed.data.texto,
    responsables: parsed.data.responsables || null,
    fecha_implementacion: parsed.data.fecha_implementacion,
    creado_por_nit: usuario.nit,
  });
  if (error) return fail("No se pudo agregar la recomendación.");

  revalidatePath(`/recomendaciones/informes/${informeId}`);
}

// Corregir un error de captura. El trigger de la base exige el motivo, rechaza el cambio si la
// recomendación ya tiene seguimientos evaluados y guarda el valor anterior en el historial.
export async function editarRecomendacion(formData: FormData): Promise<ResultadoAccion> {
  const informeId = String(formData.get("informe_id") ?? "");
  const recomendacionId = String(formData.get("recomendacion_id") ?? "");
  if (!informeId || !recomendacionId) return fail("Falta identificar la recomendación.");

  const alcance = await verificarAlcance(informeId);
  if ("error" in alcance) return alcance;
  const { supabase } = alcance;

  const parsed = edicionRecomendacionSchema.safeParse({
    texto: formData.get("texto"),
    responsables: formData.get("responsables") ?? undefined,
    fecha_implementacion: formData.get("fecha_implementacion") ?? undefined,
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Revise los campos de la recomendación.");

  const { error } = await supabase
    .from("recomendaciones")
    .update({
      texto: parsed.data.texto,
      responsables: parsed.data.responsables || null,
      fecha_implementacion: parsed.data.fecha_implementacion || null,
      motivo_ultimo_cambio: parsed.data.motivo,
    })
    .eq("id", recomendacionId);
  if (error) return fail(mensajeDeCambio(error.message, "No se pudo guardar la corrección."));

  revalidatePath(`/recomendaciones/informes/${informeId}`);
}

// "Eliminar" una deficiencia = anularla junto con su recomendación: dejan de verse pero quedan en
// la bitácora con su motivo, quién y cuándo.
export async function eliminarDeficiencia(formData: FormData): Promise<ResultadoAccion> {
  const informeId = String(formData.get("informe_id") ?? "");
  const deficienciaId = String(formData.get("deficiencia_id") ?? "");
  if (!informeId || !deficienciaId) return fail("Falta identificar la deficiencia.");

  const alcance = await verificarAlcance(informeId);
  if ("error" in alcance) return alcance;
  const { supabase } = alcance;

  const motivo = String(formData.get("motivo") ?? "").trim();
  if (motivo.length < 5) return fail("Explique brevemente el motivo (mínimo 5 caracteres).");

  const { error } = await supabase.rpc("anular_deficiencia", { p_id: deficienciaId, p_motivo: motivo });
  if (error) return fail(mensajeDeCambio(error.message, "No se pudo eliminar la deficiencia."));

  revalidatePath(`/recomendaciones/informes/${informeId}`);
  revalidatePath("/recomendaciones", "layout");
}

// "Eliminar" = anular: la recomendación deja de verse pero queda en el historial con su motivo.
export async function eliminarRecomendacion(formData: FormData): Promise<ResultadoAccion> {
  const informeId = String(formData.get("informe_id") ?? "");
  const recomendacionId = String(formData.get("recomendacion_id") ?? "");
  if (!informeId || !recomendacionId) return fail("Falta identificar la recomendación.");

  const alcance = await verificarAlcance(informeId);
  if ("error" in alcance) return alcance;
  const { supabase } = alcance;

  const motivo = String(formData.get("motivo") ?? "").trim();
  if (motivo.length < 5) return fail("Explique brevemente el motivo (mínimo 5 caracteres).");

  const { error } = await supabase.rpc("anular_recomendacion", { p_id: recomendacionId, p_motivo: motivo });
  if (error) return fail(mensajeDeCambio(error.message, "No se pudo eliminar la recomendación."));

  revalidatePath(`/recomendaciones/informes/${informeId}`);
  revalidatePath("/recomendaciones");
}

// Los mensajes de las reglas de la base (motivo, seguimientos evaluados, permisos) ya están
// redactados para el usuario; cualquier otro error se reemplaza por uno genérico.
function mensajeDeCambio(mensaje: string, generico: string) {
  return /motivo del cambio|seguimientos evaluados|No tiene permiso|bloqueado/.test(mensaje) ? mensaje : generico;
}
