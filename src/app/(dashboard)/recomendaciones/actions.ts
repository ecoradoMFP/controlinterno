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

// Desde la página del CAI se registra todo el ciclo sin salir de ella: el formulario manda
// `volver_a` y aquí solo se acepta esa ruta interna; si no, se regresa a la cédula del documento.
function rutaDeRetorno(formData: FormData, documentoId: string) {
  const volverA = String(formData.get("volver_a") ?? "");
  return /^\/recomendaciones\/cai\/[0-9a-f-]{36}$/.test(volverA) ? volverA : `/recomendaciones/documentos/${documentoId}`;
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

  revalidatePath("/recomendaciones", "layout");
  // Se regresa a la página del CAI: ahí sigue el ciclo (registrar el seguimiento).
  redirect(`/recomendaciones/cai/${datos.informe_id}`);
}

// Al emitirse el informe (u oficio) de seguimiento se registra su número y fecha.
export async function registrarDocumentoEmitido(formData: FormData) {
  const documentoId = String(formData.get("documento_id") ?? "");
  const ruta = rutaDeRetorno(formData, documentoId);
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

  revalidatePath("/recomendaciones", "layout");
  redirect(ruta);
}

// Seguimiento de un CAI completo dentro de un nombramiento: en un solo envío se registra el nuevo
// estado, las acciones y el comentario de cada recomendación pendiente del CAI. Cada recomendación
// conserva su propio ciclo (un "cumplida" la cierra: el trigger
// seguimientos_recomendacion_asignar_numero rechaza cualquier seguimiento posterior), pero se
// capturan juntas. Todas se guardan o ninguna (un solo INSERT).
export async function registrarSeguimientoCai(formData: FormData) {
  const documentoId = String(formData.get("documento_id") ?? "");
  const informeId = String(formData.get("informe_id") ?? "");
  const ruta = rutaDeRetorno(formData, documentoId);
  if (!documentoId || !informeId) fail("/recomendaciones/documentos", "Falta identificar el CAI o el nombramiento.");

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  // Sección 12.3: defensa en profundidad además de RLS (seguimientos_recomendacion_insert).
  if (!(await puedeDarSeguimiento(usuario, informeId, supabase))) {
    fail(ruta, "No tienes permiso para registrar el seguimiento de este CAI.");
  }

  const [{ data: documento }, { data: cobertura }] = await Promise.all([
    supabase.from("documentos_seguimiento").select("id, no_documento").eq("id", documentoId).maybeSingle(),
    supabase
      .from("documentos_seguimiento_informes")
      .select("informe_id")
      .eq("documento_id", documentoId)
      .eq("informe_id", informeId)
      .maybeSingle(),
  ]);
  if (!documento || !cobertura) fail(ruta, "Este nombramiento no cubre el CAI indicado.");
  if (documento.no_documento) fail(ruta, "El informe ya se emitió: la cédula está cerrada y no admite más evaluaciones.");

  const ids = formData.getAll("recomendacion_id").map(String);
  if (ids.length === 0) fail(ruta, "No hay recomendaciones por evaluar en este CAI.");

  const { data: validas } = await supabase
    .from("recomendaciones")
    .select("id, estado_actual, deficiencias!inner(informe_id)")
    .in("id", ids)
    .eq("deficiencias.informe_id", informeId);
  if ((validas ?? []).length !== ids.length) fail(ruta, "Alguna recomendación no pertenece a este CAI.");
  if ((validas ?? []).some((r) => r.estado_actual === "cumplida")) {
    fail(ruta, "Alguna recomendación ya está cumplida: su ciclo de seguimiento está cerrado.");
  }

  const filas = ids.map((rid) => {
    const parsed = seguimientoFormSchema.safeParse({
      documento_id: documentoId,
      estado: formData.get(`estado__${rid}`),
      acciones_responsables: formData.get(`acciones__${rid}`) || undefined,
      comentario_auditoria: formData.get(`comentario__${rid}`) || undefined,
    });
    return { rid, parsed };
  });
  const incompletas = filas.filter((f) => !f.parsed.success);
  if (incompletas.length > 0) {
    fail(ruta, `Falta elegir el estado de ${incompletas.length} recomendación(es). Se guardan todas juntas.`);
  }

  const { error } = await supabase.from("seguimientos_recomendacion").insert(
    filas.map(({ rid, parsed }) => {
      const d = parsed.data!;
      return {
        recomendacion_id: rid,
        documento_id: documentoId,
        // El trigger asigna el correlativo real dentro del ciclo de cada recomendación.
        numero_seguimiento: 1,
        estado: d.estado,
        acciones_responsables: d.acciones_responsables || null,
        comentario_auditoria: d.comentario_auditoria || null,
        registrado_por_nit: usuario!.nit,
      };
    }),
  );
  if (error) {
    fail(
      ruta,
      error.code === "23505"
        ? "Alguna recomendación de este CAI ya fue evaluada en este nombramiento."
        : "No se pudo registrar el seguimiento del CAI.",
    );
  }

  revalidatePath("/recomendaciones");
  revalidatePath(ruta);
  revalidatePath(`/recomendaciones/documentos/${documentoId}`);
  redirect(ruta);
}

// El informe de seguimiento se carga siempre al SAG-UDAI web; registrar esa carga es exclusivo
// del Director (trigger documentos_seguimiento_proteger_sag_udai).
export async function registrarCargaSagUdai(formData: FormData) {
  const documentoId = String(formData.get("documento_id") ?? "");
  const fecha = String(formData.get("fecha_carga_sag_udai") ?? "");
  const ruta = rutaDeRetorno(formData, documentoId);
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

  revalidatePath("/recomendaciones", "layout");
  redirect(ruta);
}
