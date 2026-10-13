"use server";

import { revalidatePath } from "next/cache";
import { errorAccion as fail, type ResultadoAccion } from "@/lib/actions/resultado";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  esJefaturaAuditoria,
  getUsuarioActual,
  puedeCerrarEtapaActividad,
  puedeCorregirHechoConsumado,
  puedeEscribir,
} from "@/lib/auth";
import { cierreExpedienteSchema, nombramientoSchema } from "@/lib/validations/actividad";
import { ACTIVIDADES_SAG_UDAI } from "@/lib/cronograma";
import { diasHabilesEntre } from "@/lib/semaforo";
import {
  ETAPA_ACTIVIDAD_LABELS,
  type CargoEnum,
  type EtapaActividadEnum,
  type FaseDocumentoEnum,
} from "@/types/domain";

// Estas acciones se usan con `FormAccion`: no redirigen (salvo la que lleva al informe), así la
// página se actualiza en su lugar sin saltar arriba ni cambiar de pestaña. Ver lib/actions/resultado.ts.

export async function agregarMiembroEquipo(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "").trim();
  const rolEnEquipo = String(formData.get("rol_en_equipo") ?? "").trim() || null;

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) return fail("No tiene permiso para modificar el equipo.");
  if (!usuarioNit) return fail("Seleccione a un usuario.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("actividades_equipo")
    .insert({ actividad_id: actividadId, usuario_nit: usuarioNit, rol_en_equipo: rolEnEquipo });

  if (error) return fail("No se pudo agregar al equipo (¿ya estaba asignado?).");

  revalidatePath(`/actividades/${actividadId}`);
}

export async function agregarDocumentoActividad(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));
  const documentoCatalogoId = String(formData.get("documento_catalogo_id") ?? "");

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) return fail("No tiene permiso para agregar documentos.");
  if (!documentoCatalogoId) return fail("Seleccione un documento del catálogo.");

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
    return fail(`"${documentoCatalogo.nombre}" pertenece a la etapa "${ETAPA_ACTIVIDAD_LABELS[documentoCatalogo.etapa as EtapaActividadEnum]}" — cierre la etapa actual antes de iniciarlo.`,
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

  if (error) return fail("No se pudo iniciar el documento (¿ya estaba iniciado?).");

  revalidatePath(`/actividades/${actividadId}`);
}

export async function agregarHito(formData: FormData): Promise<ResultadoAccion> {
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
  if (!puedeEscribir(usuario)) return fail("No tiene permiso para agregar actividades al cronograma.");
  if (!codigoJerarquico || !nombre || !etapa || !cargoResponsable || !fechaInicioEsperada || !fechaFinEsperada) {
    return fail("Complete todos los campos de la actividad.");
  }
  if (fechaFinEsperada < fechaInicioEsperada) {
    return fail("La fecha de fin esperado no puede ser anterior al inicio esperado.");
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

  if (error) return fail("No se pudo agregar la actividad (¿el número ya está usado en esta auditoría?).");

  revalidatePath(`/actividades/${actividadId}`);
}

/** Las 8 actividades con plazo SAG-UDAI, de una vez (ver `ACTIVIDADES_SAG_UDAI`). */
export async function registrarCronogramaSagUdai(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) return fail("No tiene permiso para registrar el cronograma.");

  const filas = ACTIVIDADES_SAG_UDAI.map((a) => ({
    ...a,
    del: String(formData.get(`del_${a.codigo}`) ?? ""),
    al: String(formData.get(`al_${a.codigo}`) ?? ""),
  }));
  const incompleta = filas.find((f) => !/^\d{4}-\d{2}-\d{2}$/.test(f.del) || !/^\d{4}-\d{2}-\d{2}$/.test(f.al));
  if (incompleta) return fail(`Indique las fechas "Del" y "Al" de: ${incompleta.nombre}.`);
  const invertida = filas.find((f) => f.al < f.del);
  if (invertida) return fail(`En "${invertida.nombre}", la fecha "Al" no puede ser anterior a "Del".`);

  const supabase = await createClient();
  const { data: asuetos } = await supabase.from("calendario_feriados").select("fecha");
  const feriados = new Set((asuetos ?? []).map((f) => f.fecha));

  const { error } = await supabase.from("hitos_cronograma").insert(
    filas.map((f) => ({
      actividad_id: actividadId,
      codigo_jerarquico: f.codigo,
      nombre: f.nombre,
      etapa: f.etapa,
      cargo_responsable: "auditor" as const,
      fecha_inicio_esperada: f.del,
      fecha_fin_esperada: f.al,
      dias_habiles_esperados: diasHabilesEntre(f.del, f.al, feriados),
    })),
  );
  if (error) return fail("No se pudo guardar el cronograma. Puede que ya esté registrado.");

  revalidatePath(`/actividades/${actividadId}`);
}

export async function concluirHito(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));
  const hitoId = String(formData.get("hito_id"));
  const fechaFinReal = String(formData.get("fecha_fin_real") ?? "");

  const usuario = await getUsuarioActual();
  if (!puedeEscribir(usuario)) return fail("No tiene permiso para concluir actividades del cronograma.");
  if (!fechaFinReal) return fail("Indique la fecha real de conclusión.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("hitos_cronograma")
    .update({ fecha_fin_real: fechaFinReal, estado: "concluido" })
    .eq("id", hitoId);

  if (error) return fail("No se pudo marcar la actividad como concluida.");

  revalidatePath(`/actividades/${actividadId}`);
}

export async function registrarMovimiento(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));
  const documentoActividadId = String(formData.get("documento_actividad_id"));
  const deCargo = String(formData.get("de_cargo") ?? "") || null;
  const aCargo = String(formData.get("a_cargo") ?? "");
  const tipoEvento = String(formData.get("tipo_evento") ?? "");
  const nuevaFase = String(formData.get("nueva_fase") ?? "");
  const observacion = String(formData.get("observacion") ?? "").trim() || null;
  const corrigeMovimientoId = String(formData.get("corrige_movimiento_id") ?? "") || null;
  // datetime-local llega sin zona: es hora de Guatemala (UTC-6, sin horario de verano).
  const fechaEvento = String(formData.get("fecha_evento") ?? "");
  const timestamp = fechaEvento ? new Date(`${fechaEvento}:00-06:00`) : null;

  const usuario = await getUsuarioActual();
  // Registro manual (cargos, tipo y fase elegidos a mano): solo Dirección con control_total,
  // para registros tardíos o correcciones. El trabajo diario usa `avanzarDocumento`, que sigue
  // la matriz de revisión; el trigger `proteger_fase_documento` refuerza esto en la base.
  if (!usuario || !puedeCorregirHechoConsumado(usuario)) {
    return fail("El registro manual de movimientos es exclusivo de control total.");
  }
  if (!aCargo || !tipoEvento) return fail("Complete el cargo destino y el tipo de evento.");
  if (timestamp && (Number.isNaN(timestamp.getTime()) || timestamp.getTime() > Date.now())) {
    return fail("La fecha en que ocurrió no puede ser futura.");
  }

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
    corrige_movimiento_id: corrigeMovimientoId,
    ...(timestamp ? { timestamp: timestamp.toISOString() } : {}),
  });

  if (movError) {
    return fail(movError.code === "23505"
        ? "Ese movimiento ya fue corregido antes."
        : "No se pudo registrar el movimiento (el motivo es obligatorio).",
    );
  }

  if (nuevaFase) {
    const { error: faseError } = await supabase
      .from("documentos_actividad")
      .update({ fase_actual: nuevaFase as never, cargo_actual_responsable: aCargo as never })
      .eq("id", documentoActividadId);

    if (faseError) return fail("El movimiento se registró, pero no se pudo actualizar la fase.");
  }

  revalidatePath(`/actividades/${actividadId}`);
}

export async function cerrarEtapa(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) return fail("No tiene permiso para cerrar la etapa.");

  const supabase = await createClient();

  // Defensa en profundidad (sección 12.3): `puedeEscribir` solo mira `permiso_sistema`, no el
  // alcance de cargo que exige la política RLS de `actividades` (jefe/subjefe/subdirector/
  // director, nunca Auditor).
  if (!(await puedeCerrarEtapaActividad(usuario, actividadId, supabase))) {
    return fail("Su cargo no tiene permiso para cerrar la etapa de esta auditoría.");
  }

  // Un solo paso en la base (`cerrar_etapa_actividad`): concluye con la fecha de hoy las
  // actividades del cronograma de la etapa que sigan abiertas, avanza la etapa (los triggers
  // validan documentos, equipo y cronograma) y deja el historial. Si algo falla, no queda nada a
  // medias, y el mensaje de la base ya dice qué falta.
  const { error } = await supabase.rpc("cerrar_etapa_actividad", { p_actividad_id: actividadId });
  if (error) return fail(error.message);

  revalidatePath(`/actividades/${actividadId}`);
}

/** Jefatura: corrige un plazo del cronograma con motivo (queda en su bitácora). */
export async function corregirPlazoCronograma(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));
  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario) || !esJefaturaAuditoria(usuario)) {
    return fail("Los plazos del cronograma solo los corrige la jefatura.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("corregir_plazo_cronograma", {
    p_hito_id: String(formData.get("hito_id")),
    p_inicio: String(formData.get("fecha_inicio") ?? ""),
    p_fin: String(formData.get("fecha_fin") ?? ""),
    p_motivo: String(formData.get("motivo") ?? ""),
  });
  if (error) return fail(error.message);

  revalidatePath(`/actividades/${actividadId}`);
}

/** Jefatura: corrige los datos generales de la auditoría con motivo (queda en su bitácora). */
export async function editarDatosAuditoria(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));
  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario) || !esJefaturaAuditoria(usuario)) {
    return fail("Los datos de la auditoría solo los corrige la jefatura.");
  }

  const campo = (k: string) => String(formData.get(k) ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("editar_datos_auditoria", {
    p_actividad_id: actividadId,
    p_dependencia: campo("dependencia_auditada"),
    p_periodo_inicio: campo("periodo_evaluado_inicio"),
    p_periodo_fin: campo("periodo_evaluado_fin"),
    p_auditor_principal_nit: campo("auditor_principal_nit"),
    p_fecha_inicio_plazo: campo("fecha_inicio_plazo"),
    p_fecha_notificacion: campo("fecha_notificacion"),
    p_motivo: campo("motivo"),
  });
  if (error) return fail(error.message);

  revalidatePath(`/actividades/${actividadId}`);
}

export async function actualizarConfirmacionEquipo(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "");
  const campo = String(formData.get("campo") ?? "");
  const fecha = String(formData.get("fecha") ?? "");

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) return fail("No tiene permiso para confirmar al equipo.");
  if ((campo !== "recibido" && campo !== "declaracion") || !fecha) {
    return fail("Indique la fecha.");
  }

  const supabase = await createClient();
  const cambios = campo === "recibido" ? { fecha_recibido: fecha } : { fecha_declaracion_independencia: fecha };
  const { error } = await supabase
    .from("actividades_equipo")
    .update(cambios)
    .eq("actividad_id", actividadId)
    .eq("usuario_nit", usuarioNit);

  if (error) return fail("No se pudo guardar la confirmación.");

  revalidatePath(`/actividades/${actividadId}`);
}

/**
 * Corrige una fecha del equipo ya registrada (recibido del nombramiento o Declaración de
 * Independencia): decisión de jefatura con motivo obligatorio. La función SQL
 * `corregir_fecha_equipo` valida de nuevo y deja la corrección en la bitácora del equipo.
 */
export async function corregirFechaEquipo(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));
  const usuarioNit = String(formData.get("usuario_nit") ?? "");
  const campo = String(formData.get("campo") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  const usuario = await getUsuarioActual();
  if (!esJefaturaAuditoria(usuario)) {
    return fail("Corregir una fecha ya registrada es decisión de la jefatura.");
  }
  if ((campo !== "recibido" && campo !== "declaracion") || !fecha) return fail("Indique la nueva fecha.");
  if (motivo.length < 10) return fail("Escriba el motivo de la corrección (al menos 10 caracteres).");

  const supabase = await createClient();
  const { error } = await supabase.rpc("corregir_fecha_equipo", {
    p_actividad_id: actividadId,
    p_usuario_nit: usuarioNit,
    p_campo: campo,
    p_fecha: fecha,
    p_motivo: motivo,
  });
  if (error) return fail(error.code === "P0001" ? error.message : "No se pudo corregir la fecha.");

  revalidatePath(`/actividades/${actividadId}`);
}

const ACCIONES_DOCUMENTO = ["entregar", "aprobar", "devolver", "visto_bueno"] as const;

/**
 * Flujo de revisión guiado por la matriz: la función SQL `avanzar_documento` decide a qué
 * cargo pasa el documento y en qué fase queda, y escribe bitácora y estado en una sola
 * transacción. Se envían la fase y el responsable que el usuario estaba viendo para detectar
 * que alguien más registró un paso entretanto.
 */
export async function avanzarDocumento(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));
  const documentoId = String(formData.get("documento_actividad_id"));
  const accion = String(formData.get("accion") ?? "");
  const observacion = String(formData.get("observacion") ?? "").trim();
  const faseEsperada = String(formData.get("fase_esperada") ?? "") as FaseDocumentoEnum;
  const responsableEsperado = String(formData.get("responsable_esperado") ?? "") as CargoEnum;

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) return fail("No tiene permiso para registrar pasos.");
  if (!ACCIONES_DOCUMENTO.includes(accion as (typeof ACCIONES_DOCUMENTO)[number])) {
    return fail("Acción no reconocida.");
  }
  if (accion === "devolver" && !observacion) {
    return fail("Indique en la observación qué debe corregirse.");
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
    return fail(error.code === "P0001" ? error.message : "No se pudo registrar el paso.");
  }

  revalidatePath(`/actividades/${actividadId}`);
}

function campo(formData: FormData, nombre: string) {
  return formData.get(nombre) ?? undefined;
}

export async function actualizarNombramiento(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));

  const usuario = await getUsuarioActual();
  const supabase = await createClient();
  if (!(await puedeCerrarEtapaActividad(usuario, actividadId, supabase))) {
    return fail("Su cargo no tiene permiso para modificar el nombramiento.");
  }

  const parsed = nombramientoSchema.safeParse({
    area: campo(formData, "area"),
    fecha_emision_nombramiento: campo(formData, "fecha_emision_nombramiento"),
    fecha_notificacion_equipo: campo(formData, "fecha_notificacion_equipo"),
    fecha_notificacion_dependencia: campo(formData, "fecha_notificacion_dependencia"),
    observaciones: campo(formData, "observaciones"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Revise las fechas.");

  const { error } = await supabase
    .from("actividades")
    .update(parsed.data)
    .eq("id", actividadId);

  if (error) return fail("No se pudieron guardar los datos del nombramiento.");

  revalidatePath(`/actividades/${actividadId}`);
}

/**
 * Cierre del expediente: notificación del informe, notificación a la CGC y entrega al archivo.
 * Con la entrega al archivo la auditoría queda concluida (`actividades.concluida`). Las fechas
 * ya registradas solo las corrige control_total dejando constancia en observaciones (trigger
 * `proteger_cierre_expediente`).
 */
export async function registrarCierreExpediente(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));

  const usuario = await getUsuarioActual();
  const supabase = await createClient();
  if (!(await puedeCerrarEtapaActividad(usuario, actividadId, supabase))) {
    return fail("Su cargo no tiene permiso para registrar el cierre del expediente.");
  }

  const parsed = cierreExpedienteSchema.safeParse({
    fecha_notificacion_informe: campo(formData, "fecha_notificacion_informe"),
    fecha_notificacion_cgc: campo(formData, "fecha_notificacion_cgc"),
    fecha_entrega_archivo: campo(formData, "fecha_entrega_archivo"),
    observaciones: campo(formData, "observaciones"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Revise las fechas.");

  const { error } = await supabase.from("actividades").update(parsed.data).eq("id", actividadId);

  if (error) {
    return fail(error.code === "P0001" ? error.message : "No se pudo registrar el cierre.");
  }

  revalidatePath(`/actividades/${actividadId}`);
  revalidatePath("/actividades");
}

/**
 * Pasa la auditoría al inventario de recomendaciones: crea el informe con los datos que ya
 * tiene la auditoría (nombramiento, dependencia, período, equipo) y lo deja vinculado, para que
 * solo falte capturar deficiencias y recomendaciones. Si ya existe, lleva a él.
 */
export async function crearInformeRecomendaciones(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) {
    return fail("No tiene permiso para registrar el informe.");
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
  if (!actividad) return fail("No se encontró la auditoría.");
  if (actividad.etapa_actual !== "comunicacion_resultados" && actividad.etapa_actual !== "expediente_cierre") {
    return fail("El informe se registra a partir de Comunicación de Resultados.");
  }

  // Mismo motivo que en `crearActividad`: id generado aquí para no depender de RETURNING.
  const informeId = crypto.randomUUID();
  const { error } = await supabase.from("informes_auditoria").insert({
    id: informeId,
    actividad_id: actividadId,
    no_nombramiento: actividad.no_nombramiento,
    // El CAI de la auditoría pasa tal cual al seguimiento de sus recomendaciones.
    cai: actividad.cai,
    anio_cai: actividad.anio_cai,
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
    return fail("No se pudo crear el informe en Recomendaciones (solo jefatura del departamento, subdirección o dirección pueden hacerlo).",
    );
  }

  const equipo = (actividad.actividades_equipo ?? []).map((m) => ({ informe_id: informeId, usuario_nit: m.usuario_nit }));
  if (equipo.length > 0) {
    await supabase.from("informes_auditoria_equipo").insert(equipo);
  }

  revalidatePath(`/actividades/${actividadId}`);
  redirect(`/recomendaciones/informes/${informeId}`);
}

/**
 * "No aplica" con justificación: decisión de la jefatura (función SQL `marcar_no_aplica`, que
 * valida cargo, etapa y justificación y deja constancia en la bitácora). Cuenta como resuelto
 * para cerrar la etapa; se puede revertir con motivo mientras la etapa siga abierta.
 */
export async function marcarNoAplica(formData: FormData): Promise<ResultadoAccion> {
  const actividadId = String(formData.get("actividad_id"));
  const documentoId = String(formData.get("documento_actividad_id"));
  const justificacion = String(formData.get("justificacion") ?? "").trim();
  const revertir = formData.get("revertir") === "1";

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) return fail("No tiene permiso para esta acción.");
  if (justificacion.length < 10) return fail("Escriba la justificación (al menos 10 caracteres).");

  const supabase = await createClient();
  const { error } = await supabase.rpc("marcar_no_aplica", {
    p_documento_id: documentoId,
    p_justificacion: justificacion,
    p_revertir: revertir,
  });

  if (error) {
    return fail(error.code === "P0001" ? error.message : "No se pudo registrar el cambio.");
  }

  revalidatePath(`/actividades/${actividadId}`);
}
