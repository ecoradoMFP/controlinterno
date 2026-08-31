import { z } from "zod";

// Sección 10: formato de nombramiento observado en los registros reales, validado tal cual
// (no se inventa un formato nuevo).
const NO_NOMBRAMIENTO_REGEX = /^NAI-\d{3}-\d{4}$/;

export const actividadFormSchema = z
  .object({
    no_nombramiento: z
      .string()
      .trim()
      .regex(NO_NOMBRAMIENTO_REGEX, "Formato esperado: NAI-XXX-AAAA"),
    departamento_id: z.uuid("Selecciona un departamento"),
    auditor_principal_nit: z.string().trim().min(1, "Selecciona al auditor principal"),
    dependencia_auditada: z.string().trim().min(1, "Requerido"),
    tipo_auditoria: z.string().trim().min(1, "Requerido"),
    periodo_evaluado_inicio: z.iso.date(),
    periodo_evaluado_fin: z.iso.date(),
    fecha_inicio_plazo: z.iso.date(),
    fecha_notificacion: z.iso.date(),
    expedientes_relacionados: z.string().trim().optional(),
  })
  .refine((data) => data.periodo_evaluado_fin >= data.periodo_evaluado_inicio, {
    error: "El fin del período no puede ser anterior a su inicio",
    path: ["periodo_evaluado_fin"],
  })
  .refine((data) => data.fecha_notificacion >= data.fecha_inicio_plazo, {
    error: "La fecha de notificación no puede ser anterior al inicio del plazo",
    path: ["fecha_notificacion"],
  });

export type ActividadFormValues = z.infer<typeof actividadFormSchema>;

/** "a, b, c" -> ["a", "b", "c"], filtrando vacíos. */
export function parseExpedientesRelacionados(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
