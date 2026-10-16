import { z } from "zod";
import { JORNADA_FIN, JORNADA_INICIO, MOTIVO_POR_DEFECTO, TIPOS_PERMISO } from "@/lib/permisos";

const hora = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const permisoFormSchema = z
  .object({
    usuario_nit: z.string().trim().min(1, "Elija a la persona"),
    fecha: z.iso.date({ error: "Fecha no válida" }),
    tipo: z.enum(TIPOS_PERMISO, { error: "Elija el tipo" }),
    hora_inicio: hora,
    hora_fin: hora,
    hora_llegada: hora,
    motivo: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
  })
  .transform((v, ctx) => {
    let inicio: string | null = null;
    let fin: string | null = null;

    if (v.tipo === "entrada_tardia") {
      if (!v.hora_llegada) {
        ctx.addIssue({ code: "custom", path: ["hora_llegada"], message: "Indique la hora de llegada" });
        return z.NEVER;
      }
      if (v.hora_llegada <= JORNADA_INICIO || v.hora_llegada > JORNADA_FIN) {
        ctx.addIssue({ code: "custom", path: ["hora_llegada"], message: "Debe ser después de las 8:00 y antes de las 16:30" });
        return z.NEVER;
      }
      inicio = JORNADA_INICIO;
      fin = v.hora_llegada;
    } else if (v.tipo !== "nota_marcaje") {
      if (!v.hora_inicio || !v.hora_fin) {
        if (!v.hora_inicio) ctx.addIssue({ code: "custom", path: ["hora_inicio"], message: "Indique la hora de salida" });
        if (!v.hora_fin) ctx.addIssue({ code: "custom", path: ["hora_fin"], message: "Indique la hora de regreso" });
        return z.NEVER;
      }
      if (v.hora_inicio < JORNADA_INICIO || v.hora_fin > JORNADA_FIN) {
        ctx.addIssue({ code: "custom", path: ["hora_inicio"], message: "El horario debe estar entre las 8:00 y las 16:30" });
        return z.NEVER;
      }
      if (v.hora_fin <= v.hora_inicio) {
        ctx.addIssue({ code: "custom", path: ["hora_fin"], message: "Debe ser posterior a la hora de inicio" });
        return z.NEVER;
      }
      inicio = v.hora_inicio;
      fin = v.hora_fin;
    }

    return {
      usuario_nit: v.usuario_nit,
      fecha: v.fecha,
      tipo: v.tipo,
      hora_inicio: inicio,
      hora_fin: fin,
      motivo: v.motivo || MOTIVO_POR_DEFECTO[v.tipo],
    };
  });

export type PermisoForm = z.output<typeof permisoFormSchema>;
