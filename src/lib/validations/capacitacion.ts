import { z } from "zod";

export const capacitacionFormSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido"),
  institucion: z.string().trim().min(1, "Requerido"),
  horas: z
    .string()
    .trim()
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, { error: "Debe ser un número mayor a 0" }),
  fecha: z.iso.date(),
});
