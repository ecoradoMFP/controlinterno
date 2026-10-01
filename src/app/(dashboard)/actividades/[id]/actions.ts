"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getUsuarioActual,
  puedeCerrarEtapaActividad,
  puedeCorregirHechoConsumado,
  puedeEscribir,
} from "@/lib/auth";
import { normalizarRutaExpediente } from "@/lib/expediente-digital";
import { cierreExpedienteSchema, nombramientoSchema } from "@/lib/validations/actividad";
import {
  SIGUIENTE_ETAPA,
  ETAPA_ACTIVIDAD_LABELS,
  type CargoEnum,
  type EtapaActividadEnum,
  type FaseDocumentoEnum,
} from "@/types/domain";

function fail(actividadId: string, tab: string, message: string): never {
  redirect(`/actividades/${actividadId}?tab=${tab}&error=${encodeURIComponent(message)}`);
}

export async function agregarMiembroEquipo(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "").trim();
  const rolEnEquipo = String(formData.get("rol_en_equipo") ?? "").trim() || null;

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(actividadId, "equipo", "No tienes permiso para modificar el equipo.");
  if (!usuarioNit) fail(actividadId, "equipo", "Selecciona a un usuario.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("actividades_equipo")
    .insert({ actividad_id: actividadId, usuario_nit: usuarioNit, rol_en_equipo: rolEnEquipo });

  if (error) fail(actividadId, "equipo", "No se pudo agregar al equipo (¿ya estaba asignado?).");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=equipo`);
}

export async function agregarDocumentoActividad(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const documentoCatalogoId = String(formData.get("documento_catalogo_id") ?? "");

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(actividadId, "documentos", "No tienes permiso para agregar documentos.");
  if (!documentoCatalogoId) fail(actividadId, "documentos", "Selecciona un documento del catálogo.");

  const supabase = await createClient();

  // No se puede iniciar un documento de una etapa que la actividad todavía no alcanzó (ej.
  // un documento de Ejecución mientras la actividad sigue en Planificación) — reforzado
  // también en la base de datos (política RLS de documentos_actividad), esto solo da un
  // mensaje más claro que el genérico de RLS.
  const [{ data: actividad }, { data: documentoCatalogo }] = await Promise.all([
    supabase.from("actividades").select("etapa_actual, departamento_id").eq("id", actividadId).maybeSingle(),
    supabase.from("documentos_catalogo").select("etapa, nombre").eq("id", documentoCatalogoId).maybeSingle(),
  ]);
  if (actividad && documentoCatalogo && documentoCatalogo.etapa !== actividad.etapa_actual) {
    fail(
      actividadId,
      "documentos",
      `"${documentoCatalogo.nombre}" pertenece a la etapa "${ETAPA_ACTIVIDAD_LABELS[documentoCatalogo.etapa as EtapaActividadEnum]}" — cierra la etapa actual antes de iniciarlo.`,
    );
  }

  // El responsable inicial es quien elabora según la matriz de revisión (primer cargo).
  const { data: primerCargo } = await supabase
    .from("documentos_catalogo_revision")
    .select("cargo")
    .eq("documento_catalogo_id", documentoCatalogoId)
    .eq("departamento_id", actividad?.departamento_id ?? "")
    .order("orden_revision")
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("documentos_actividad").insert({
    actividad_id: actividadId,
    documento_catalogo_id: documentoCatalogoId,
    cargo_actual_responsable: primerCargo?.cargo ?? "auditor",
  });

  if (error) fail(actividadId, "documentos", "No se pudo iniciar el documento (¿ya estaba iniciado?).");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=documentos`);
}

export async function agregarHito(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const codigoJerarquico = String(formData.get("codigo_jerarquico") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const etapa = String(formData.get("etapa") ?? "");
  const cargoResponsable = String(formData.get("cargo_responsable") ?? "");
  const fechaInicioEsperada = String(formData.get("fecha_inicio_esperada") ?? "");
  const fechaFinEsperada = String(formData.get("fecha_fin_esperada") ?? "");
  const diasHabilesEsperados = Number(formData.get("dias_habiles_esperados"));
  const documentoCatalogoId = String(formData.get("documento_catalogo_id") ?? "") || null;

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(actividadId, "cronograma", "No tienes permiso para agregar hitos.");
  if (!codigoJerarquico || !nombre || !etapa || !cargoResponsable || !fechaInicioEsperada || !fechaFinEsperada) {
    fail(actividadId, "cronograma", "Completa todos los campos requeridos del hito.");
  }
  if (fechaFinEsperada < fechaInicioEsperada) {
    fail(actividadId, "cronograma", "La fecha de fin esperado no puede ser anterior al inicio esperado.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("hitos_cronograma").insert({
    actividad_id: actividadId,
    codigo_jerarquico: codigoJerarquico,
    nombre,
    etapa: etapa as never,
    cargo_responsable: cargoResponsable as never,
    fecha_inicio_esperada: fechaInicioEsperada,
    fecha_fin_esperada: fechaFinEsperada,
    dias_habiles_esperados: diasHabilesEsperados,
    documento_catalogo_id: documentoCatalogoId,
  });

  if (error) fail(actividadId, "cronograma", "No se pudo agregar el hito (¿código ya usado en esta actividad?).");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=cronograma`);
}

export async function concluirHito(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const hitoId = String(formData.get("hito_id"));
  const fechaFinReal = String(formData.get("fecha_fin_real") ?? "");

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(actividadId, "cronograma", "No tienes permiso para concluir hitos.");
  if (!fechaFinReal) fail(actividadId, "cronograma", "Indica la fecha real de conclusión.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("hitos_cronograma")
    .update({ fecha_fin_real: fechaFinReal, estado: "concluido" })
    .eq("id", hitoId);

  if (error) fail(actividadId, "cronograma", "No se pudo marcar el hito como concluido.");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=cronograma`);
}

export async function registrarMovimiento(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const documentoActividadId = String(formData.get("documento_actividad_id"));
  const deCargo = String(formData.get("de_cargo") ?? "") || null;
  const aCargo = String(formData.get("a_cargo") ?? "");
  const tipoEvento = String(formData.get("tipo_evento") ?? "");
  const nuevaFase = String(formData.get("nueva_fase") ?? "");
  const observacion = String(formData.get("observacion") ?? "").trim() || null;

  const usuario = await getUsuarioActual();
  // Registro manual (cargos, tipo y fase elegidos a mano): solo Dirección con control_total,
  // para registros tardíos o correcciones. El trabajo diario usa `avanzarDocumento`, que sigue
  // la matriz de revisión; el trigger `proteger_fase_documento` refuerza esto en la base.
  if (!usuario || !puedeCorregirHechoConsumado(usuario)) {
    fail(actividadId, "documentos", "El registro manual de movimientos es exclusivo de control total.");
  }
  if (!aCargo || !tipoEvento) fail(actividadId, "documentos", "Completa el cargo destino y el tipo de evento.");

  const supabase = await createClient();

  // El registro y el avance de fase del documento son dos escrituras separadas por diseño:
  // `movimientos` es la bitácora inmutable (sección 4.8), `documentos_actividad.fase_actual`
  // es el estado mutable que resume "dónde va" ahora mismo. Si el avance de fase falla, no
  // dejamos un movimiento huérfano registrado sin reflejo en el estado actual.
  const { error: movError } = await supabase.from("movimientos").insert({
    documento_actividad_id: documentoActividadId,
    de_cargo: deCargo as never,
    a_cargo: aCargo as never,
    tipo_evento: tipoEvento as never,
    observacion,
    registrado_por_nit: usuario.nit,
    es_correccion_direccion: true,
  });

  if (movError) fail(actividadId, "documentos", "No se pudo registrar el movimiento (la observación es obligatoria).");

  if (nuevaFase) {
    const { error: faseError } = await supabase
      .from("documentos_actividad")
      .update({ fase_actual: nuevaFase as never, cargo_actual_responsable: aCargo as never })
      .eq("id", documentoActividadId);

    if (faseError) fail(actividadId, "documentos", "El movimiento se registró, pero no se pudo actualizar la fase.");
  }

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=documentos`);
}

export async function cerrarEtapa(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) fail(actividadId, "documentos", "No tienes permiso para cerrar la etapa.");

  const supabase = await createClient();

  // Defensa en profundidad (sección 12.3): `puedeEscribir` solo mira `permiso_sistema`, no el
  // alcance de cargo que exige la política RLS de `actividades` (jefe/subjefe/subdirector/
  // director, nunca Auditor) — sin este chequeo, un Auditor veía el botón habilitado y, al
  // hacer clic, el único error que le llegaba era el mensaje crudo de Postgres/RLS.
  if (!(await puedeCerrarEtapaActividad(usuario, actividadId, supabase))) {
    fail(actividadId, "documentos", "Tu cargo no tiene permiso para cerrar la etapa de esta actividad.");
  }

  const { data: actividad } = await supabase
    .from("actividades")
    .select("etapa_actual")
    .eq("id", actividadId)
    .maybeSingle();
  if (!actividad) fail(actividadId, "documentos", "No se encontró la actividad.");

  const etapaCerrada = actividad.etapa_actual;
  const etapaSiguiente = SIGUIENTE_ETAPA[etapaCerrada];
  if (!etapaSiguiente) fail(actividadId, "documentos", "El expediente ya está en Expediente / Cierre.");

  // El UPDATE es la escritura que de verdad cuenta — el trigger `validar_avance_etapa` (sección
  // 12.1/12.3, defensa en profundidad) es quien valida que no queden documentos ni hitos de la
  // etapa actual sin terminar, y que el equipo haya confirmado recibido/declaración si aplica.
  // El historial se inserta después, solo si el avance fue real: al revés dejaría constancia de
  // un cierre que en realidad no ocurrió.
  const { error: updateError } = await supabase
    .from("actividades")
    .update({ etapa_actual: etapaSiguiente })
    .eq("id", actividadId);

  if (updateError) fail(actividadId, "documentos", updateError.message);

  const { error: historialError } = await supabase.from("actividades_etapa_historial").insert({
    actividad_id: actividadId,
    etapa_cerrada: etapaCerrada,
    etapa_siguiente: etapaSiguiente,
    cerrado_por_nit: usuario.nit,
  });

  if (historialError) {
    fail(actividadId, "documentos", "La etapa se cerró, pero no se pudo registrar en el historial.");
  }

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=documentos`);
}

export async function actualizarConfirmacionEquipo(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "");
  const campo = String(formData.get("campo") ?? "");
  const fecha = String(formData.get("fecha") ?? "");

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) fail(actividadId, "equipo", "No tienes permiso para confirmar al equipo.");
  if ((campo !== "recibido" && campo !== "declaracion") || !fecha) {
    fail(actividadId, "equipo", "Indica la fecha.");
  }

  const supabase = await createClient();
  const cambios = campo === "recibido" ? { fecha_recibido: fecha } : { fecha_declaracion_independencia: fecha };
  const { error } = await supabase
    .from("actividades_equipo")
    .update(cambios)
    .eq("actividad_id", actividadId)
    .eq("usuario_nit", usuarioNit);

  if (error) fail(actividadId, "equipo", "No se pudo guardar la confirmación.");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=equipo`);
}

const ACCIONES_DOCUMENTO = ["entregar", "aprobar", "devolver", "visto_bueno"] as const;

/**
 * Flujo de revisión guiado por la matriz: la función SQL `avanzar_documento` decide a qué
 * cargo pasa el documento y en qué fase queda, y escribe bitácora y estado en una sola
 * transacción. Se envían la fase y el responsable que el usuario estaba viendo para detectar
 * que alguien más registró un paso entretanto.
 */
export async function avanzarDocumento(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const documentoId = String(formData.get("documento_actividad_id"));
  const accion = String(formData.get("accion") ?? "");
  const observacion = String(formData.get("observacion") ?? "").trim();
  const faseEsperada = String(formData.get("fase_esperada") ?? "") as FaseDocumentoEnum;
  const responsableEsperado = String(formData.get("responsable_esperado") ?? "") as CargoEnum;

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) fail(actividadId, "documentos", "No tienes permiso para registrar pasos.");
  if (!ACCIONES_DOCUMENTO.includes(accion as (typeof ACCIONES_DOCUMENTO)[number])) {
    fail(actividadId, "documentos", "Acción no reconocida.");
  }
  if (accion === "devolver" && !observacion) {
    fail(actividadId, "documentos", "Indica en la observación qué debe corregirse.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("avanzar_documento", {
    p_documento_id: documentoId,
    p_accion: accion,
    p_observacion: observacion || undefined,
    p_fase_esperada: accion === "visto_bueno" ? undefined : faseEsperada || undefined,
    p_responsable_esperado: accion === "visto_bueno" ? undefined : responsableEsperado || undefined,
  });

  // Los mensajes de `avanzar_documento` están escritos para el usuario final (P0001 = RAISE);
  // cualquier otro error (RLS, red) se resume sin exponer detalles internos.
  if (error) {
    fail(actividadId, "documentos", error.code === "P0001" ? error.message : "No se pudo registrar el paso.");
  }

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=documentos`);
}

export async function actualizarRutaDocumento(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));
  const documentoId = String(formData.get("documento_actividad_id"));

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) fail(actividadId, "documentos", "No tienes permiso para modificar el documento.");

  const ruta = normalizarRutaExpediente(String(formData.get("ruta_archivo") ?? ""));
  if (!ruta.ok) fail(actividadId, "documentos", ruta.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("documentos_actividad")
    .update({ ruta_archivo: ruta.ruta })
    .eq("id", documentoId);

  if (error) fail(actividadId, "documentos", "No se pudo guardar la ruta del archivo.");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=documentos`);
}

function campo(formData: FormData, nombre: string) {
  return formData.get(nombre) ?? undefined;
}

export async function actualizarNombramiento(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));

  const usuario = await getUsuarioActual();
  const supabase = await createClient();
  if (!(await puedeCerrarEtapaActividad(usuario, actividadId, supabase))) {
    fail(actividadId, "expediente", "Tu cargo no tiene permiso para modificar el nombramiento.");
  }

  const parsed = nombramientoSchema.safeParse({
    area: campo(formData, "area"),
    fecha_emision_nombramiento: campo(formData, "fecha_emision_nombramiento"),
    fecha_notificacion_equipo: campo(formData, "fecha_notificacion_equipo"),
    fecha_notificacion_dependencia: campo(formData, "fecha_notificacion_dependencia"),
    observaciones: campo(formData, "observaciones"),
  });
  if (!parsed.success) fail(actividadId, "expediente", parsed.error.issues[0]?.message ?? "Revisa las fechas.");

  const ruta = normalizarRutaExpediente(String(formData.get("ruta_expediente") ?? ""));
  if (!ruta.ok) fail(actividadId, "expediente", ruta.error);

  const { error } = await supabase
    .from("actividades")
    .update({ ...parsed.data, ruta_expediente: ruta.ruta })
    .eq("id", actividadId);

  if (error) fail(actividadId, "expediente", "No se pudieron guardar los datos del nombramiento.");

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/actividades/${actividadId}?tab=expediente`);
}

/**
 * Cierre del expediente: notificación del informe, notificación a la CGC y entrega al archivo.
 * Con la entrega al archivo la auditoría queda concluida (`actividades.concluida`). Las fechas
 * ya registradas solo las corrige control_total dejando constancia en observaciones (trigger
 * `proteger_cierre_expediente`).
 */
export async function registrarCierreExpediente(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));

  const usuario = await getUsuarioActual();
  const supabase = await createClient();
  if (!(await puedeCerrarEtapaActividad(usuario, actividadId, supabase))) {
    fail(actividadId, "expediente", "Tu cargo no tiene permiso para registrar el cierre del expediente.");
  }

  const parsed = cierreExpedienteSchema.safeParse({
    fecha_notificacion_informe: campo(formData, "fecha_notificacion_informe"),
    fecha_notificacion_cgc: campo(formData, "fecha_notificacion_cgc"),
    fecha_entrega_archivo: campo(formData, "fecha_entrega_archivo"),
    observaciones: campo(formData, "observaciones"),
  });
  if (!parsed.success) fail(actividadId, "expediente", parsed.error.issues[0]?.message ?? "Revisa las fechas.");

  const { error } = await supabase.from("actividades").update(parsed.data).eq("id", actividadId);

  if (error) {
    fail(actividadId, "expediente", error.code === "P0001" ? error.message : "No se pudo registrar el cierre.");
  }

  revalidatePath(`/actividades/${actividadId}`);
  revalidatePath("/actividades");
  redirect(`/actividades/${actividadId}?tab=expediente`);
}

/**
 * Pasa la auditoría al inventario de recomendaciones: crea el informe con los datos que ya
 * tiene la auditoría (nombramiento, dependencia, período, equipo) y lo deja vinculado, para que
 * solo falte capturar deficiencias y recomendaciones. Si ya existe, lleva a él.
 */
export async function crearInformeRecomendaciones(formData: FormData) {
  const actividadId = String(formData.get("actividad_id"));

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) {
    fail(actividadId, "expediente", "No tienes permiso para registrar el informe.");
  }

  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("informes_auditoria")
    .select("id")
    .eq("actividad_id", actividadId)
    .maybeSingle();
  if (existente) redirect(`/recomendaciones/informes/${existente.id}`);

  const { data: actividad } = await supabase
    .from("actividades")
    .select("*, actividades_equipo(usuario_nit)")
    .eq("id", actividadId)
    .maybeSingle();
  if (!actividad) fail(actividadId, "expediente", "No se encontró la auditoría.");
  if (actividad.etapa_actual !== "comunicacion_resultados" && actividad.etapa_actual !== "expediente_cierre") {
    fail(actividadId, "expediente", "El informe se registra a partir de Comunicación de Resultados.");
  }

  // Mismo motivo que en `crearActividad`: id generado aquí para no depender de RETURNING.
  const informeId = crypto.randomUUID();
  const { error } = await supabase.from("informes_auditoria").insert({
    id: informeId,
    actividad_id: actividadId,
    no_nombramiento: actividad.no_nombramiento,
    fecha_nombramiento: actividad.fecha_emision_nombramiento,
    departamento_id: actividad.departamento_id,
    dependencia_auditada: actividad.dependencia_auditada,
    tipo_auditoria: actividad.tipo_auditoria,
    periodo_auditado_inicio: actividad.periodo_evaluado_inicio,
    periodo_auditado_fin: actividad.periodo_evaluado_fin,
    fecha_notificacion: actividad.fecha_notificacion_informe,
    ruta_archivo: actividad.ruta_expediente,
    creado_por_nit: usuario.nit,
  });

  if (error) {
    fail(
      actividadId,
      "expediente",
      "No se pudo crear el informe en Recomendaciones (solo jefatura del departamento, subdirección o dirección pueden hacerlo).",
    );
  }

  const equipo = (actividad.actividades_equipo ?? []).map((m) => ({ informe_id: informeId, usuario_nit: m.usuario_nit }));
  if (equipo.length > 0) {
    await supabase.from("informes_auditoria_equipo").insert(equipo);
  }

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/recomendaciones/informes/${informeId}`);
}
