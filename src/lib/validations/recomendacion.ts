import { z } from "zod";

const fechaOpcional = z.iso.date().optional().or(z.literal(""));
const estadoRecomendacion = z.enum(["pendiente", "en_proceso", "no_cumplida", "cumplida"]);

// DAF identifica cada auditoría por nombramiento y CAI; Administrativas solo por CAI.
export const informeFormSchema = z
  .object({
    no_nombramiento: z.string().trim().optional(),
    cai: z.string().trim().optional(),
    departamento_id: z.string().trim().min(1, "Requerido"),
    dependencia_auditada: z.string().trim().min(1, "Requerido"),
    tipo_auditoria: z.string().trim().optional(),
    periodo_auditado_inicio: fechaOpcional,
    periodo_auditado_fin: fechaOpcional,
    fecha_nombramiento: fechaOpcional,
    fecha_informe_final: fechaOpcional,
    fecha_notificacion: fechaOpcional,
    supervisor_nit: z.string().trim().optional(),
    coordinador_nit: z.string().trim().optional(),
    riesgo: z.string().trim().optional(),
  })
  .refine((v) => v.no_nombramiento || v.cai, {
    error: "Captura el No. de nombramiento, el CAI, o ambos",
    path: ["no_nombramiento"],
  })
  .refine((v) => !v.no_nombramiento || v.fecha_nombramiento, {
    error: "Requerida si capturas el nombramiento",
    path: ["fecha_nombramiento"],
  })
  .refine((v) => !v.periodo_auditado_inicio === !v.periodo_auditado_fin, {
    error: "Captura ambas fechas del período auditado, o ninguna",
    path: ["periodo_auditado_fin"],
  })
  .refine((v) => !v.periodo_auditado_inicio || !v.periodo_auditado_fin || v.periodo_auditado_fin >= v.periodo_auditado_inicio, {
    error: "El período auditado no puede terminar antes de empezar",
    path: ["periodo_auditado_fin"],
  });

export const deficienciaFormSchema = z.object({
  titulo: z.string().trim().min(1, "Requerido"),
  descripcion: z.string().trim().optional(),
});

// El estado inicial es el que la recomendación trae al informe final (1ra etapa de la matriz de
// DAF); los seguimientos posteriores se registran en el desglose de la recomendación.
export const recomendacionFormSchema = z.object({
  texto: z.string().trim().min(1, "Requerido"),
  responsables: z.string().trim().optional(),
  fecha_implementacion: fechaOpcional,
  estado_inicial: estadoRecomendacion.default("pendiente"),
});

// Nombramiento de seguimiento: lo emite la jefatura, nombra a uno o varios auditores y cubre uno
// o varios CAI/informes. El número del informe u oficio resultante se registra al emitirse, y
// con eso se cierra su cédula. Un oficio (la excepción) no lleva nombramiento.
export const nombramientoFormSchema = z
  .object({
    departamento_id: z.string().trim().min(1, "Requerido"),
    tipo_documento: z.enum(["informe", "oficio"]),
    no_nombramiento: z.string().trim().optional(),
    fecha_nombramiento: fechaOpcional,
    no_documento: z.string().trim().optional(),
    fecha_documento: fechaOpcional,
    auditores: z.array(z.string().trim().min(1)).min(1, "Nombra al menos a un auditor"),
    informes: z.array(z.uuid()).min(1, "Elige al menos un CAI/informe"),
  })
  .refine((v) => v.tipo_documento === "oficio" || v.no_nombramiento, {
    error: "Requerido para un informe de seguimiento",
    path: ["no_nombramiento"],
  })
  .refine((v) => v.tipo_documento === "oficio" || v.fecha_nombramiento, { error: "Requerida", path: ["fecha_nombramiento"] })
  .refine((v) => !v.no_documento || v.fecha_documento, { error: "Requerida", path: ["fecha_documento"] });

export const documentoEmitidoSchema = z.object({
  no_documento: z.string().trim().min(1, "Requerido"),
  fecha_documento: z.iso.date({ error: "Requerida" }),
});

export const seguimientoFormSchema = z.object({
  documento_id: z.uuid({ error: "Elige el nombramiento de seguimiento" }),
  estado: estadoRecomendacion,
  acciones_responsables: z.string().trim().optional(),
  comentario_auditoria: z.string().trim().optional(),
});
