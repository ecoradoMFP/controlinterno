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
