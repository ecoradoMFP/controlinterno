import type { EstadoRecomendacionEnum } from "@/types/domain";

/** Fecha de hoy (YYYY-MM-DD) en hora de Guatemala, no la del servidor (UTC). */
export function hoyGuatemala(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(new Date());
}

/** Solo "cumplida" cierra el ciclo de una recomendación; las demás siguen abiertas. */
export function estaAbierta(estado: EstadoRecomendacionEnum): boolean {
  return estado !== "cumplida";
}

/** Abierta y con la fecha de implementación comprometida ya pasada. */
export function estaVencida(
  estado: EstadoRecomendacionEnum,
  fechaImplementacion: string | null,
  hoy: string = hoyGuatemala(),
): boolean {
  return estaAbierta(estado) && !!fechaImplementacion && fechaImplementacion < hoy;
}

/** "hace 3 meses" / "hace 12 días" a partir de una fecha YYYY-MM-DD. */
export function haceCuanto(fecha: string, hoy: string = hoyGuatemala()): string {
  const dias = Math.round((Date.parse(hoy) - Date.parse(fecha)) / 86_400_000);
  if (dias < 0) return "fecha futura";
  if (dias < 60) return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
  const meses = Math.floor(dias / 30.44);
  return `hace ${meses} meses`;
}

/** "00006" -> "CAI 00006"; ya prefijado se deja igual. */
export function etiquetaCai(cai: string | null): string | null {
  if (!cai) return null;
  return /^cai/i.test(cai) ? cai : `CAI ${cai}`;
}

export type BucketRecomendacion = "activa" | "en_seguimiento" | "atendida";

type SeguimientoParaBucket = {
  numero_seguimiento: number;
  estado: EstadoRecomendacionEnum;
  documentos_seguimiento: { no_documento: string | null; fecha_documento: string | null } | null;
};

/**
 * En qué panel debe verse una recomendación y, si aplica, el año que la ubica ahí.
 *
 * Se basa en el último seguimiento con documento (informe/oficio) EMITIDO, no en el estado_actual
 * crudo ni en el último seguimiento sin importar si se emitió: mientras ese documento siga en
 * elaboración la recomendación se queda en "activa" (el cambio de panel ocurre hasta la tercera
 * etapa del ciclo — emitir el documento —, no al solo registrar el resultado). Si el último
 * emitido resultó cumplida, el panel es permanente ("atendida", histórico por año). Si no, es
 * "en_seguimiento" solo mientras ese año siga siendo el actual; al iniciar un año calendario
 * nuevo vuelve a "activa" sin intervención manual.
 */
export function ubicarRecomendacion(
  seguimientos: SeguimientoParaBucket[],
  hoy: string = hoyGuatemala(),
): { bucket: BucketRecomendacion; anio: number | null } {
  const ultimoEmitido = seguimientos
    .filter((s) => s.numero_seguimiento > 0 && s.documentos_seguimiento?.no_documento)
    .sort((a, b) => b.numero_seguimiento - a.numero_seguimiento)[0];
  if (!ultimoEmitido) return { bucket: "activa", anio: null };

  const anio = Number(ultimoEmitido.documentos_seguimiento!.fecha_documento!.slice(0, 4));
  if (ultimoEmitido.estado === "cumplida") return { bucket: "atendida", anio };
  return { bucket: anio === Number(hoy.slice(0, 4)) ? "en_seguimiento" : "activa", anio };
}
