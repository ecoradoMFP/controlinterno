import { z } from "zod";

const NO_OFICIO_REGEX = /^DAI-[A-Z]{2,6}-\d{3}-\d{4}$/;

export const MEDIOS_ENVIO = ["Físico"] as const;

export const oficioFormSchema = z.object({
  no_oficio: z
    .string()
    .trim()
    .regex(NO_OFICIO_REGEX, "Formato esperado: DAI-DEPTO-XXX-AAAA"),
  actividad_id: z.uuid().optional().or(z.literal("")),
  dependencia_destino: z.string().trim().min(1, "Seleccione la dependencia"),
  destinatario: z.string().trim().min(1, "Requerido"),
  puesto_destinatario: z.string().trim().optional(),
  asunto: z.string().trim().min(1, "Requerido"),
  responsable_elaboracion_nit: z.string().trim().min(1),
  fecha_emision: z.iso.date(),
  medio_envio: z.enum(MEDIOS_ENVIO, { error: "Seleccione el medio de envío" }),
  plazo_respuesta_dias: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isInteger(v) && v > 0), {
      error: "Debe ser un número entero positivo",
    }),
  fecha_vencimiento: z.iso.date().optional().or(z.literal("")),
  observaciones: z.string().trim().optional(),
});

export type OficioFormValues = z.infer<typeof oficioFormSchema>;
