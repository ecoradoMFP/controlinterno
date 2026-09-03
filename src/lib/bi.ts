// Prompt maestro, sección 7: métricas de BI derivadas de la bitácora y del cronograma.
// Funciones puras — el fetch de datos y el respeto al alcance de RLS vive en la página.

import { diasHabilesEntre, cumplidoATiempo } from "@/lib/semaforo";
import type { CargoEnum, EtapaDocumentoEnum } from "@/types/domain";

const MS_POR_HORA = 1000 * 60 * 60;

export interface DocumentoParaPermanencia {
  created_at: string;
  departamentoNombre: string | null;
  documentoNombre: string | null;
  movimientos: { de_cargo: CargoEnum | null; a_cargo: CargoEnum; timestamp: string }[];
}

export interface SegmentoPermanencia {
  cargo: CargoEnum;
  horas: number;
  departamentoNombre: string | null;
  documentoNombre: string | null;
}

/**
 * Sección 7: "tiempo promedio de permanencia por cargo" — el dato central del cuello de
 * botella. Se mide en horas reales de reloj (timestamp a timestamp), no en días calendario: un
 * documento puede ir y volver entre dos cargos varias veces en la misma jornada (p. ej. una
 * corrección rápida), y truncar a fecha colapsaría todos esos tramos a "1 día" cada uno,
 * ocultando exactamente el patrón que este reporte necesita mostrar. No excluye noches/fines de
 * semana/feriados (a diferencia del semáforo de hitos/oficios, que sí lo hace porque ahí se mide
 * contra un plazo en días hábiles) — si más adelante se quiere "horas hábiles" en vez de horas de
 * reloj, es un cambio localizado aquí.
 *
 * Solo se cuentan tramos cerrados (delimitados por dos eventos, o por la creación del documento
 * y su primer movimiento): un tramo abierto (documento todavía en manos de alguien, sin evento
 * siguiente) es censura por la derecha y sesgaría el promedio histórico si se mezclara con
 * tramos ya concluidos.
 */
export function calcularSegmentosPermanencia(documentos: DocumentoParaPermanencia[]): SegmentoPermanencia[] {
  const segmentos: SegmentoPermanencia[] = [];

  for (const doc of documentos) {
    const eventos = [...doc.movimientos].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let cursorMs = new Date(doc.created_at).getTime();
    // El primer movimiento registra de dónde salió el documento (de_cargo); si falta (p. ej.
    // el primer evento es una recepción sin entrega previa registrada), no podemos saber quién
    // lo tuvo entre la creación y ese evento, así que ese primer tramo simplemente no se cuenta.
    let cargoActual: CargoEnum | null = eventos[0]?.de_cargo ?? null;

    for (const evento of eventos) {
      const eventoMs = new Date(evento.timestamp).getTime();
      if (cargoActual) {
        segmentos.push({
          cargo: cargoActual,
          horas: (eventoMs - cursorMs) / MS_POR_HORA,
          departamentoNombre: doc.departamentoNombre,
          documentoNombre: doc.documentoNombre,
        });
      }
      cursorMs = eventoMs;
      cargoActual = evento.a_cargo;
    }
  }

  return segmentos;
}

export interface RankingCuelloBotella {
  clave: string;
  horasPromedio: number;
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
    actual.suma += s.horas;
    actual.n += 1;
    acumulado.set(k, actual);
  }
  return [...acumulado.entries()]
    .map(([clave, { suma, n }]) => ({ clave, horasPromedio: suma / n, n }))
    .sort((a, b) => b.horasPromedio - a.horasPromedio);
}

/** "6.5 h" bajo un día, "3.2 días" arriba — para que un tramo de 40 min no se lea como "0.0 días"
 * ni uno de 12 días se lea como "288.0 h". */
export function formatearHoras(horas: number): string {
  if (Math.abs(horas) < 24) return `${horas.toFixed(1)} h`;
  return `${(horas / 24).toFixed(1)} días`;
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
