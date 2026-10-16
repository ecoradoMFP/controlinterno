import { diasHabilesEntre, cumplidoATiempo } from "@/lib/semaforo";
import type { CargoEnum, EtapaDocumentoEnum } from "@/types/domain";

const MS_POR_HORA = 1000 * 60 * 60;

const JORNADA_INICIO_HORA = 8;
const JORNADA_FIN_HORA = 16.5;
export const HORAS_JORNADA = JORNADA_FIN_HORA - JORNADA_INICIO_HORA;
const DESFASE_GUATEMALA_MS = -6 * MS_POR_HORA;

export function horasHabilesEntre(desdeMs: number, hastaMs: number, feriados: ReadonlySet<string>): number {
  if (hastaMs <= desdeMs) return 0;
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

export function calcularSegmentosPermanencia(
  documentos: DocumentoParaPermanencia[],
  feriados: ReadonlySet<string>,
): SegmentoPermanencia[] {
  const segmentos: SegmentoPermanencia[] = [];

  for (const doc of documentos) {
    const eventos = [...doc.movimientos].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let cursorMs = new Date(doc.created_at).getTime();
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

export function formatearHoras(horas: number): string {
  if (Math.abs(horas) < HORAS_JORNADA) return `${horas.toFixed(1)} h`;
  return `${(horas / HORAS_JORNADA).toFixed(1)} días hábiles`;
}

export interface Cumplimiento {
  aTiempo: number;
  tarde: number;
  pct: number | null;
}

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
