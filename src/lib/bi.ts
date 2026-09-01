// Prompt maestro, sección 7: métricas de BI derivadas de la bitácora y del cronograma.
// Funciones puras — el fetch de datos y el respeto al alcance de RLS vive en la página.

import { diasHabilesEntre, cumplidoATiempo } from "@/lib/semaforo";
import type { CargoEnum, EtapaDocumentoEnum } from "@/types/domain";

function isoDate(ts: string): string {
  return ts.slice(0, 10);
}

export interface DocumentoParaPermanencia {
  created_at: string;
  departamentoNombre: string | null;
  documentoNombre: string | null;
  movimientos: { de_cargo: CargoEnum | null; a_cargo: CargoEnum; timestamp: string }[];
}

export interface SegmentoPermanencia {
  cargo: CargoEnum;
  dias: number;
  departamentoNombre: string | null;
  documentoNombre: string | null;
}

/**
 * Sección 7: "tiempo promedio de permanencia por cargo (días en posesión)" — el dato central
 * del cuello de botella. Solo se cuentan tramos cerrados (delimitados por dos eventos, o por
 * la creación del documento y su primer movimiento): un tramo abierto (documento todavía en
 * manos de alguien, sin evento siguiente) es censura por la derecha y sesgaría el promedio
 * histórico si se mezclara con tramos ya concluidos.
 */
export function calcularSegmentosPermanencia(
  documentos: DocumentoParaPermanencia[],
  feriados: ReadonlySet<string>,
): SegmentoPermanencia[] {
  const segmentos: SegmentoPermanencia[] = [];

  for (const doc of documentos) {
    const eventos = [...doc.movimientos].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let cursorISO = isoDate(doc.created_at);
    // El primer movimiento registra de dónde salió el documento (de_cargo); si falta (p. ej.
    // el primer evento es una recepción sin entrega previa registrada), no podemos saber quién
    // lo tuvo entre la creación y ese evento, así que ese primer tramo simplemente no se cuenta.
    let cargoActual: CargoEnum | null = eventos[0]?.de_cargo ?? null;

    for (const evento of eventos) {
      const eventoISO = isoDate(evento.timestamp);
      if (cargoActual) {
        segmentos.push({
          cargo: cargoActual,
          dias: diasHabilesEntre(cursorISO, eventoISO, feriados),
          departamentoNombre: doc.departamentoNombre,
          documentoNombre: doc.documentoNombre,
        });
      }
      cursorISO = eventoISO;
      cargoActual = evento.a_cargo;
    }
  }

  return segmentos;
}

export interface RankingCuelloBotella {
  clave: string;
  diasPromedio: number;
  n: number;
}

export function promediarPorClave(
  segmentos: SegmentoPermanencia[],
  clave: (s: SegmentoPermanencia) => string | null,
): RankingCuelloBotella[] {
  const acumulado = new Map<string, { suma: number; n: number }>();
  for (const s of segmentos) {
    const k = clave(s);
    if (k === null) continue;
    const actual = acumulado.get(k) ?? { suma: 0, n: 0 };
    actual.suma += s.dias;
    actual.n += 1;
    acumulado.set(k, actual);
  }
  return [...acumulado.entries()]
    .map(([clave, { suma, n }]) => ({ clave, diasPromedio: suma / n, n }))
    .sort((a, b) => b.diasPromedio - a.diasPromedio);
}

export interface Cumplimiento {
  aTiempo: number;
  tarde: number;
  pct: number | null;
}

/** Sección 7: "% de cumplimiento histórico de plazos (concluidos a tiempo vs. tarde)". */
export function calcularCumplimiento(items: { esperada: string; real: string }[]): Cumplimiento {
  let aTiempo = 0;
  let tarde = 0;
  for (const item of items) {
    if (cumplidoATiempo(item.esperada, item.real)) aTiempo++;
    else tarde++;
  }
  const total = aTiempo + tarde;
  return { aTiempo, tarde, pct: total > 0 ? (aTiempo / total) * 100 : null };
}

export interface PlanVsReal {
  etapa: EtapaDocumentoEnum;
  planPromedio: number;
  realPromedio: number;
  n: number;
}

/** Sección 7: "comparación plan vs. real por etapa" — mismo patrón que "Real" vs "Proyectado"
 * que ya se usa a mano en los cronogramas fuente. Solo hitos ya concluidos (tienen fecha real). */
export function calcularPlanVsReal(
  hitos: {
    etapa: EtapaDocumentoEnum;
    dias_habiles_esperados: number;
    fecha_inicio_esperada: string;
    fecha_fin_real: string;
  }[],
  feriados: ReadonlySet<string>,
): PlanVsReal[] {
  const acumulado = new Map<EtapaDocumentoEnum, { plan: number; real: number; n: number }>();
  for (const h of hitos) {
    const actual = acumulado.get(h.etapa) ?? { plan: 0, real: 0, n: 0 };
    actual.plan += h.dias_habiles_esperados;
    actual.real += diasHabilesEntre(h.fecha_inicio_esperada, h.fecha_fin_real, feriados);
    actual.n += 1;
    acumulado.set(h.etapa, actual);
  }
  return [...acumulado.entries()].map(([etapa, { plan, real, n }]) => ({
    etapa,
    planPromedio: plan / n,
    realPromedio: real / n,
    n,
  }));
}
