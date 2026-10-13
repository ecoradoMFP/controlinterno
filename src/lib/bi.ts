// Prompt maestro, sección 7: métricas de BI derivadas de la bitácora y del cronograma.
// Funciones puras — el fetch de datos y el respeto al alcance de RLS vive en la página.

import { diasHabilesEntre, cumplidoATiempo } from "@/lib/semaforo";
import type { CargoEnum, EtapaDocumentoEnum } from "@/types/domain";

const MS_POR_HORA = 1000 * 60 * 60;

/** Jornada de la DAI: 8:00 a 16:30, hora de Guatemala (UTC-6 todo el año, sin horario de verano). */
const JORNADA_INICIO_HORA = 8;
const JORNADA_FIN_HORA = 16.5;
export const HORAS_JORNADA = JORNADA_FIN_HORA - JORNADA_INICIO_HORA;
const DESFASE_GUATEMALA_MS = -6 * MS_POR_HORA;

/**
 * Horas hábiles entre dos instantes: solo cuenta lo que cae dentro de la jornada (8:00 a 16:30)
 * de lunes a viernes que no sean asueto. Un documento recibido el viernes a las 16:00 y entregado
 * el lunes a las 9:00 suma 1.5 h (media hora del viernes + una del lunes), no 65 h de reloj.
 */
export function horasHabilesEntre(desdeMs: number, hastaMs: number, feriados: ReadonlySet<string>): number {
  if (hastaMs <= desdeMs) return 0;
  // Se trabaja en "hora local como si fuera UTC" para que la fecha y el día de la semana salgan
  // de Guatemala y no de la zona del servidor.
  const desde = desdeMs + DESFASE_GUATEMALA_MS;
  const hasta = hastaMs + DESFASE_GUATEMALA_MS;
  const MS_DIA = 24 * MS_POR_HORA;
  let total = 0;
  for (let dia = Math.floor(desde / MS_DIA) * MS_DIA; dia < hasta; dia += MS_DIA) {
    const fecha = new Date(dia);
    const diaSemana = fecha.getUTCDay();
    if (diaSemana === 0 || diaSemana === 6 || feriados.has(fecha.toISOString().slice(0, 10))) continue;
    const ini = Math.max(desde, dia + JORNADA_INICIO_HORA * MS_POR_HORA);
    const fin = Math.min(hasta, dia + JORNADA_FIN_HORA * MS_POR_HORA);
    if (fin > ini) total += fin - ini;
  }
  return total / MS_POR_HORA;
}

/**
 * Quita de la bitácora los movimientos que la Dirección corrigió (`corrige_movimiento_id`): siguen
 * a la vista en la hoja de ruta, marcados, pero no cuentan para tiempos ni flujos — los reemplaza
 * la corrección.
 */
export function sinCorregidos<T extends { id: string; corrige_movimiento_id: string | null }>(movimientos: T[]): T[] {
  const corregidos = new Set(movimientos.map((m) => m.corrige_movimiento_id).filter(Boolean));
  return movimientos.filter((m) => !corregidos.has(m.id));
}

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
 * botella. Se mide en horas hábiles (`horasHabilesEntre`: jornada de 8:00 a 16:30, sin fines de
 * semana ni asuetos), timestamp a timestamp y no por fecha: un documento puede ir y volver entre
 * dos cargos varias veces en la misma jornada, y truncar a fecha colapsaría esos tramos a "1 día"
 * cada uno. Las noches y fines de semana no cuentan, para no culpar a quien recibe un documento
 * el viernes por la tarde.
 *
 * Solo se cuentan tramos cerrados (delimitados por dos eventos, o por la creación del documento
 * y su primer movimiento): un tramo abierto (documento todavía en manos de alguien, sin evento
 * siguiente) es censura por la derecha y sesgaría el promedio histórico si se mezclara con
 * tramos ya concluidos.
 */
export function calcularSegmentosPermanencia(
  documentos: DocumentoParaPermanencia[],
  feriados: ReadonlySet<string>,
): SegmentoPermanencia[] {
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
          horas: horasHabilesEntre(cursorMs, eventoMs, feriados),
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

/** Horas hábiles en palabras: "6.5 h" bajo una jornada, "3.2 días hábiles" arriba (1 día hábil =
 * una jornada de 8.5 h), para que un tramo de 40 min no se lea como "0.1 días hábiles". */
export function formatearHoras(horas: number): string {
  if (Math.abs(horas) < HORAS_JORNADA) return `${horas.toFixed(1)} h`;
  return `${(horas / HORAS_JORNADA).toFixed(1)} días hábiles`;
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
