"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  departamentosParaNombrarSeguimiento,
  getUsuarioActual,
  puedeDarSeguimiento,
  puedeEscribir,
} from "@/lib/auth";
import {
  documentoEmitidoSchema,
  nombramientoFormSchema,
  seguimientoFormSchema,
} from "@/lib/validations/recomendacion";

function fail(ruta: string, message: string, fieldErrors?: Record<string, string>): never {
  const params = new URLSearchParams({ error: message });
  if (fieldErrors) params.set("fieldErrors", JSON.stringify(fieldErrors));
  const sep = ruta.includes("?") ? "&" : "?";
  redirect(`${ruta}${sep}${params.toString()}`);
}

function erroresPorCampo(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

// La jefatura emite el nombramiento de seguimiento de UN informe: nombra auditor(es). A partir de
// ahí los auditores nombrados pueden registrar el seguimiento de las recomendaciones de ese
// informe (authz.puede_dar_seguimiento).
export async function crearNombramientoSeguimiento(formData: FormData) {
  const informeElegido = String(formData.get("informe_id") ?? "");
  const ruta = `/recomendaciones/documentos/nuevo${informeElegido ? `?informe=${informeElegido}` : ""}`;

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  const campo = (nombre: string) => formData.get(nombre) || undefined;
  const parsed = nombramientoFormSchema.safeParse({
    departamento_id: formData.get("departamento_id"),
    no_nombramiento: campo("no_nombramiento"),
    fecha_nombramiento: campo("fecha_nombramiento"),
    no_documento: campo("no_documento"),
    fecha_documento: campo("fecha_documento"),
    auditores: formData.getAll("auditores").map(String),
    informe_id: campo("informe_id"),
  });
  if (!parsed.success) fail(ruta, "Revisa los campos marcados.", erroresPorCampo(parsed.error.issues));
  const datos = parsed.data;

  // Sección 12.3: defensa en profundidad además de RLS (documentos_seguimiento_insert).
  const gestionables = await departamentosParaNombrarSeguimiento(usuario, supabase);
  if (!gestionables.includes(datos.departamento_id)) {
    fail(ruta, "No tienes permiso para emitir nombramientos de seguimiento en ese departamento.");
  }

  // Id generado aquí: la visibilidad del documento se decide re-consultando la tabla, así que
  // no se encadena `.select()` tras el insert (mismo patrón que crearInforme). tipo_documento no
  // se pide aquí: esta pantalla siempre produce un nombramiento -> informe (default de la
  // columna); un oficio no lleva nombramiento y no se crea desde este flujo.
  const id = crypto.randomUUID();
  const { error } = await supabase.from("documentos_seguimiento").insert({
    id,
    departamento_id: datos.departamento_id,
    no_nombramiento: datos.no_nombramiento,
    fecha_nombramiento: datos.fecha_nombramiento,
    no_documento: datos.no_documento || null,
    fecha_documento: datos.fecha_documento || null,
    creado_por_nit: usuario!.nit,
  });
  if (error) {
    fail(
      ruta,
      error.code === "23505"
        ? `El informe u oficio ${datos.no_documento} ya está registrado.`
        : "No se pudo registrar el nombramiento de seguimiento.",
    );
  }

  const [{ error: errorAuditores }, { error: errorInforme }] = await Promise.all([
    supabase
      .from("documentos_seguimiento_auditores")
      .insert([...new Set(datos.auditores)].map((usuario_nit) => ({ documento_id: id, usuario_nit }))),
    supabase.from("documentos_seguimiento_informes").insert({ documento_id: id, informe_id: datos.informe_id }),
  ]);
  if (errorAuditores || errorInforme) {
    fail(`/recomendaciones/documentos/${id}`, "El nombramiento se registró, pero no se pudieron guardar todos sus auditores o el informe.");
  }

  revalidatePath("/recomendaciones");
  redirect(`/recomendaciones/documentos/${id}`);
}

// Al emitirse el informe (u oficio) de seguimiento se registra su número y fecha.
export async function registrarDocumentoEmitido(formData: FormData) {
  const documentoId = String(formData.get("documento_id") ?? "");
  const ruta = `/recomendaciones/documentos/${documentoId}`;
  if (!documentoId) fail("/recomendaciones", "Falta identificar el nombramiento.");

  const parsed = documentoEmitidoSchema.safeParse({
    no_documento: formData.get("no_documento"),
    fecha_documento: formData.get("fecha_documento"),
  });
  if (!parsed.success) fail(ruta, "Captura el número y la fecha del informe u oficio.", erroresPorCampo(parsed.error.issues));

  const supabase = await createClient();
  // RLS (documentos_seguimiento_update -> authz.puede_gestionar_documento) decide si puede: la
  // jefatura que nombró o los auditores nombrados. `.select()` para distinguir "sin permiso"
  // (0 filas) de un error.
  const { data, error } = await supabase
    .from("documentos_seguimiento")
    .update({ no_documento: parsed.data.no_documento, fecha_documento: parsed.data.fecha_documento })
    .eq("id", documentoId)
    .select("id");
  if (error) {
    fail(ruta, error.code === "23505" ? `El número ${parsed.data.no_documento} ya está registrado.` : "No se pudo registrar el documento.");
  }
  if (!data?.length) fail(ruta, "No tienes permiso para registrar el documento de este nombramiento.");

  revalidatePath(ruta);
  redirect(ruta);
}

// Un paso más del ciclo de UNA recomendación, dentro de un nombramiento de seguimiento que cubre
// su informe. El ciclo termina cuando queda "cumplida" — el trigger
// seguimientos_recomendacion_asignar_numero rechaza cualquier seguimiento posterior.
export async function registrarSeguimiento(formData: FormData) {
  const recomendacionId = String(formData.get("recomendacion_id") ?? "");
  const ruta = `/recomendaciones/${recomendacionId}`;
  if (!recomendacionId) fail("/recomendaciones", "Falta identificar la recomendación.");

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  const { data: recomendacion } = await supabase
    .from("recomendaciones")
    .select("id, estado_actual, deficiencias(informe_id)")
    .eq("id", recomendacionId)
    .maybeSingle();
  const informeId = recomendacion?.deficiencias?.informe_id;
  if (!recomendacion || !informeId) fail("/recomendaciones", "No se encontró la recomendación.");

  // Sección 12.3: defensa en profundidad además de RLS (seguimientos_recomendacion_insert).
  if (!(await puedeDarSeguimiento(usuario, informeId, supabase))) {
    fail(ruta, "No tienes permiso para registrar seguimientos de esta recomendación.");
  }
  if (recomendacion.estado_actual === "cumplida") {
    fail(ruta, "La recomendación ya está cumplida: su ciclo de seguimiento está cerrado.");
  }

  const parsed = seguimientoFormSchema.safeParse({
    documento_id: formData.get("documento_id") || undefined,
    estado: formData.get("estado"),
    acciones_responsables: formData.get("acciones_responsables") || undefined,
    comentario_auditoria: formData.get("comentario_auditoria") || undefined,
  });
  if (!parsed.success) fail(ruta, "Revisa los campos del seguimiento.", erroresPorCampo(parsed.error.issues));

  const { error } = await supabase.from("seguimientos_recomendacion").insert({
    recomendacion_id: recomendacionId,
    documento_id: parsed.data.documento_id,
    // El trigger asigna el correlativo real dentro del ciclo de la recomendación.
    numero_seguimiento: 1,
    estado: parsed.data.estado,
    acciones_responsables: parsed.data.acciones_responsables || null,
    comentario_auditoria: parsed.data.comentario_auditoria || null,
    registrado_por_nit: usuario!.nit,
  });
  if (error) {
    fail(
      ruta,
      error.code === "23505"
        ? "Esta recomendación ya fue evaluada en ese seguimiento."
        : "No se pudo registrar el seguimiento.",
    );
  }

  revalidatePath("/recomendaciones");
  redirect(ruta);
}

// El informe de seguimiento se carga siempre al SAG-UDAI web; registrar esa carga es exclusivo
// del Director (trigger documentos_seguimiento_proteger_sag_udai).
export async function registrarCargaSagUdai(formData: FormData) {
  const documentoId = String(formData.get("documento_id") ?? "");
  const fecha = String(formData.get("fecha_carga_sag_udai") ?? "");
  const ruta = `/recomendaciones/documentos/${documentoId}`;
  if (!documentoId) fail("/recomendaciones", "Falta identificar el documento.");

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario) || usuario?.cargo !== "director") {
    fail(ruta, "Solo el Director puede registrar la carga al SAG-UDAI.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) fail(ruta, "Indica la fecha de carga al SAG-UDAI.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("documentos_seguimiento")
    .update({ fecha_carga_sag_udai: fecha })
    .eq("id", documentoId);
  if (error) fail(ruta, "No se pudo registrar la carga al SAG-UDAI (¿ya tiene número de informe u oficio?).");

  revalidatePath(ruta);
  redirect(ruta);
}
