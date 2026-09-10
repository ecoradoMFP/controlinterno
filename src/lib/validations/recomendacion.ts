import { z } from "zod";

export const informeFormSchema = z
  .object({
    no_nombramiento: z.string().trim().min(1, "Requerido"),
    cai: z.string().trim().optional(),
    departamento_id: z.string().trim().min(1, "Requerido"),
    dependencia_auditada: z.string().trim().min(1, "Requerido"),
    periodo_auditado_inicio: z.iso.date(),
    periodo_auditado_fin: z.iso.date(),
    fecha: z.iso.date(),
    fecha_informe_final: z.iso.date().optional().or(z.literal("")),
    supervisor_nit: z.string().trim().optional(),
    coordinador_nit: z.string().trim().optional(),
    riesgo: z.string().trim().optional(),
  })
  .refine((v) => v.periodo_auditado_fin >= v.periodo_auditado_inicio, {
    error: "El período auditado no puede terminar antes de empezar",
    path: ["periodo_auditado_fin"],
  });

export const deficienciaFormSchema = z.object({
  titulo: z.string().trim().min(1, "Requerido"),
  descripcion: z.string().trim().optional(),
});

export const recomendacionFormSchema = z.object({
  texto: z.string().trim().min(1, "Requerido"),
  fecha_implementacion: z.iso.date().optional().or(z.literal("")),
});

export const seguimientoFormSchema = z.object({
  no_informe_seguimiento: z.string().trim().min(1, "Requerido"),
  fecha: z.iso.date(),
  estado: z.enum(["pendiente", "en_proceso", "atendida"]),
  comentario: z.string().trim().optional(),
});
