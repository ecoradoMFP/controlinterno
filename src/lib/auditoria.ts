import { etiquetaCai } from "@/lib/recomendaciones";

export function identificadorAuditoria(a: { cai: string | null; anio_cai: number | null; no_nombramiento: string }): string {
  return etiquetaCai(a.cai, a.anio_cai) ?? a.no_nombramiento;
}
