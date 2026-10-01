import { z } from "zod";
import {
  LARGO_MAXIMO_NUMERO,
  formatoNombramientoValido,
  mensajeFormatoNombramiento,
} from "@/lib/validations/formatos";

const fechaOpcional = z.iso.date().optional().or(z.literal("")).transform((v) => v || null);
const textoOpcional = z.string().trim().optional().transform((v) => v || null);

export const actividadFormSchema = z
  .object({
    // Formato abierto: los nombramientos de la DAI no siguen un único patrón (ver
    // `src/lib/validations/formatos.ts`, donde se agregará la validación cuando se defina).
    no_nombramiento: z
      .string()
      .trim()
      .min(1, "Requerido")
      .max(LARGO_MAXIMO_NUMERO, `Máximo ${LARGO_MAXIMO_NUMERO} caracteres`)
      .refine(formatoNombramientoValido, { error: mensajeFormatoNombramiento }),
    departamento_id: z.uuid("Selecciona un departamento"),
    auditor_principal_nit: z.string().trim().min(1, "Selecciona al auditor principal"),
    dependencia_auditada: z.string().trim().min(1, "Requerido"),
    tipo_auditoria: z.string().trim().min(1, "Requerido"),
    area: textoOpcional,
    periodo_evaluado_inicio: z.iso.date(),
    periodo_evaluado_fin: z.iso.date(),
    fecha_emision_nombramiento: fechaOpcional,
    fecha_notificacion_equipo: fechaOpcional,
    fecha_notificacion_dependencia: fechaOpcional,
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
  })
  .refine(
    (data) =>
      !data.fecha_emision_nombramiento ||
      !data.fecha_notificacion_equipo ||
      data.fecha_notificacion_equipo >= data.fecha_emision_nombramiento,
    { error: "No puede ser anterior a la emisión del nombramiento", path: ["fecha_notificacion_equipo"] },
  )
  .refine(
    (data) =>
      !data.fecha_emision_nombramiento ||
      !data.fecha_notificacion_dependencia ||
      data.fecha_notificacion_dependencia >= data.fecha_emision_nombramiento,
    { error: "No puede ser anterior a la emisión del nombramiento", path: ["fecha_notificacion_dependencia"] },
  );

export type ActividadFormValues = z.infer<typeof actividadFormSchema>;

/** Datos del nombramiento que se completan o corrigen después de crear la auditoría. */
export const nombramientoSchema = z
  .object({
    area: textoOpcional,
    fecha_emision_nombramiento: fechaOpcional,
    fecha_notificacion_equipo: fechaOpcional,
    fecha_notificacion_dependencia: fechaOpcional,
    observaciones: textoOpcional,
  })
  .refine(
    (d) => !d.fecha_emision_nombramiento || !d.fecha_notificacion_equipo || d.fecha_notificacion_equipo >= d.fecha_emision_nombramiento,
    { error: "La notificación al equipo no puede ser anterior a la emisión del nombramiento" },
  )
  .refine(
    (d) =>
      !d.fecha_emision_nombramiento ||
      !d.fecha_notificacion_dependencia ||
      d.fecha_notificacion_dependencia >= d.fecha_emision_nombramiento,
    { error: "La notificación a la dependencia no puede ser anterior a la emisión del nombramiento" },
  );

/** Cierre del expediente: la auditoría concluye con la entrega al archivo. */
export const cierreExpedienteSchema = z
  .object({
    fecha_notificacion_informe: fechaOpcional,
    fecha_notificacion_cgc: fechaOpcional,
    fecha_entrega_archivo: fechaOpcional,
    observaciones: textoOpcional,
  })
  .refine((d) => !d.fecha_notificacion_cgc || !!d.fecha_notificacion_informe, {
    error: "Registra primero la notificación del informe",
  })
  .refine((d) => !d.fecha_entrega_archivo || !!d.fecha_notificacion_informe, {
    error: "La entrega al archivo requiere la fecha de notificación del informe",
  })
  .refine((d) => !d.fecha_notificacion_cgc || !d.fecha_notificacion_informe || d.fecha_notificacion_cgc >= d.fecha_notificacion_informe, {
    error: "La notificación a la CGC no puede ser anterior a la del informe",
  })
  .refine((d) => !d.fecha_entrega_archivo || !d.fecha_notificacion_informe || d.fecha_entrega_archivo >= d.fecha_notificacion_informe, {
    error: "La entrega al archivo no puede ser anterior a la notificación del informe",
  });

/** "a, b, c" -> ["a", "b", "c"], filtrando vacíos. */
export function parseExpedientesRelacionados(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
