import { z } from "zod";

const fechaOpcional = z.iso.date().optional().or(z.literal(""));
const estadoRecomendacion = z.enum(["pendiente", "en_proceso", "no_cumplida", "cumplida"]);

export const informeFormSchema = z
  .object({
    no_nombramiento: z.string().trim().min(1, "Requerido"),
    cai: z.string().trim().min(1, "Requerido"),
    anio_cai: z.coerce.number().int().min(2000, "Año inválido").max(2100, "Año inválido"),
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
    error: "Capture ambas fechas del período auditado, o ninguna",
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

export const deficienciaConRecomendacionSchema = deficienciaFormSchema.extend({
  texto: z.string().trim().min(1, "Escriba la recomendación"),
  responsables: z.string().trim().optional(),
  fecha_implementacion: z.iso.date({ error: "La fecha de implementación es obligatoria" }),
});

export const recomendacionFormSchema = z.object({
  texto: z.string().trim().min(1, "Requerido"),
  responsables: z.string().trim().optional(),
  fecha_implementacion: z.iso.date({ error: "La fecha de implementación es obligatoria" }),
});

export const nombramientoFormSchema = z
  .object({
    departamento_id: z.string().trim().min(1, "Requerido"),
    informe_id: z.uuid({ error: "Elija un informe" }),
    no_nombramiento: z.string().trim().min(1, "Requerido"),
    fecha_nombramiento: z.iso.date({ error: "Requerida" }),
    coordinador_nit: z.string().trim().min(1, "Seleccione al coordinador"),
    fecha_limite_informe: z.iso.date({ error: "Requerida" }),
    no_documento: z.string().trim().optional(),
    fecha_documento: fechaOpcional,
    auditores: z.array(z.string().trim().min(1)).min(1, "Nombre al menos a un auditor"),
  })
  .refine((v) => !v.no_documento || v.fecha_documento, { error: "Requerida", path: ["fecha_documento"] });

export const documentoEmitidoSchema = z.object({
  no_documento: z.string().trim().min(1, "Requerido"),
  fecha_documento: z.iso.date({ error: "Requerida" }),
});

export const seguimientoFormSchema = z.object({
  documento_id: z.uuid({ error: "Elija el nombramiento de seguimiento" }),
  estado: estadoRecomendacion,
  acciones_responsables: z.string().trim().optional(),
  comentario_auditoria: z.string().trim().optional(),
});

export const edicionDeficienciaSchema = z.object({
  titulo: z.string().trim().min(1, "Requerido"),
  descripcion: z.string().trim().optional(),
  motivo: z.string().trim().min(5, "Explica brevemente el motivo (mínimo 5 caracteres)"),
});

export const edicionRecomendacionSchema = z.object({
  texto: z.string().trim().min(1, "Requerido"),
  responsables: z.string().trim().optional(),
  fecha_implementacion: z.iso.date({ error: "La fecha de implementación es obligatoria" }),
  motivo: z.string().trim().min(5, "Explica brevemente el motivo (mínimo 5 caracteres)"),
});
