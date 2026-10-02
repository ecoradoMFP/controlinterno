import { z } from "zod";

const fechaOpcional = z.iso.date().optional().or(z.literal(""));
const estadoRecomendacion = z.enum(["pendiente", "en_proceso", "no_cumplida", "cumplida"]);

// El módulo da seguimiento solo a CAI, y todo CAI se emite con su nombramiento: ambos son obligatorios.
export const informeFormSchema = z
  .object({
    no_nombramiento: z.string().trim().min(1, "Requerido"),
    cai: z.string().trim().min(1, "Requerido"),
    departamento_id: z.string().trim().min(1, "Requerido"),
    dependencia_auditada: z.string().trim().min(1, "Requerido"),
    tipo_auditoria: z.string().trim().min(1, "Requerido"),
    periodo_auditado_inicio: fechaOpcional,
    periodo_auditado_fin: fechaOpcional,
    fecha_nombramiento: z.iso.date({ error: "Requerida" }),
    fecha_informe_final: fechaOpcional,
    fecha_notificacion: fechaOpcional,
    supervisor_nit: z.string().trim().optional(),
    coordinador_nit: z.string().trim().optional(),
    riesgo: z.string().trim().optional(),
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

// Deficiencia y su única recomendación, capturadas en un solo paso.
export const deficienciaConRecomendacionSchema = deficienciaFormSchema.extend({
  texto: z.string().trim().min(1, "Escribe la recomendación"),
  responsables: z.string().trim().optional(),
  fecha_implementacion: z.iso.date({ error: "La fecha de implementación es obligatoria" }),
});

// Al cargar el informe toda recomendación nace "Pendiente"; los seguimientos posteriores se
// registran en el desglose de la recomendación. La fecha de implementación es obligatoria.
export const recomendacionFormSchema = z.object({
  texto: z.string().trim().min(1, "Requerido"),
  responsables: z.string().trim().optional(),
  fecha_implementacion: z.iso.date({ error: "La fecha de implementación es obligatoria" }),
});

// Nombramiento de seguimiento: lo emite la jefatura, es por UN informe (CAI) y nombra a uno o
// varios auditores. Cubre todas las recomendaciones del informe, también las que se agreguen
// después. El número del informe resultante se registra al emitirse, y con eso se cierra su
// cédula. (Un oficio, la excepción sin nombramiento, no se crea desde aquí.)
export const nombramientoFormSchema = z
  .object({
    departamento_id: z.string().trim().min(1, "Requerido"),
    informe_id: z.uuid({ error: "Elige un informe" }),
    no_nombramiento: z.string().trim().min(1, "Requerido"),
    fecha_nombramiento: z.iso.date({ error: "Requerida" }),
    no_documento: z.string().trim().optional(),
    fecha_documento: fechaOpcional,
    auditores: z.array(z.string().trim().min(1)).min(1, "Nombra al menos a un auditor"),
  })
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

// Corregir una deficiencia ya capturada: igual que la recomendación, siempre con motivo.
export const edicionDeficienciaSchema = z.object({
  titulo: z.string().trim().min(1, "Requerido"),
  descripcion: z.string().trim().optional(),
  motivo: z.string().trim().min(5, "Explica brevemente el motivo (mínimo 5 caracteres)"),
});

// Corregir una recomendación ya capturada: siempre con motivo (queda en el historial).
export const edicionRecomendacionSchema = z.object({
  texto: z.string().trim().min(1, "Requerido"),
  responsables: z.string().trim().optional(),
  fecha_implementacion: z.iso.date({ error: "La fecha de implementación es obligatoria" }),
  motivo: z.string().trim().min(5, "Explica brevemente el motivo (mínimo 5 caracteres)"),
});
