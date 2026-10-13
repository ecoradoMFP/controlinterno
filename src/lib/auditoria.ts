import { etiquetaCai } from "@/lib/recomendaciones";

/**
 * Identificador visible de una auditoría: su CAI ("CAI 00001-2026"). Las registradas antes de que
 * se pidiera el CAI caen en su número de nombramiento.
 */
export function identificadorAuditoria(a: { cai: string | null; anio_cai: number | null; no_nombramiento: string }): string {
  return etiquetaCai(a.cai, a.anio_cai) ?? a.no_nombramiento;
}
