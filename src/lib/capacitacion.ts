// Módulo de capacitaciones: cumplimiento de la norma interna de horas de capacitación anual.

import type { ColorSemaforo } from "@/lib/semaforo";

/** Norma interna de la Dirección: 50 horas de capacitación por persona por año. Fijo por
 * ahora (a diferencia de `parametros_semaforo`, no es un umbral que Dirección ajuste seguido) —
 * si eso cambia, conviene una tabla de configuración igual que el semáforo de documentos. */
export const HORAS_OBJETIVO_ANUAL = 50;

/** Mismos 4 colores que el semáforo de documentos, reutilizados aquí para que el lenguaje
 * visual sea consistente en toda la app: verde = meta cumplida, rojo = nada registrado. */
export function colorCumplimiento(horasAcumuladas: number): ColorSemaforo {
  if (horasAcumuladas <= 0) return "rojo";
  if (horasAcumuladas < HORAS_OBJETIVO_ANUAL / 2) return "naranja";
  if (horasAcumuladas < HORAS_OBJETIVO_ANUAL) return "amarillo";
  return "verde";
}

export function pctCumplimiento(horasAcumuladas: number): number {
  return Math.min(100, (horasAcumuladas / HORAS_OBJETIVO_ANUAL) * 100);
}

/** Etiquetas propias del módulo (no las de `COLOR_SEMAFORO_LABELS`, que hablan de riesgo de
 * plazo — aquí el mismo color significa avance hacia la meta de horas). */
export const COLOR_CUMPLIMIENTO_LABELS: Record<ColorSemaforo, string> = {
  verde: "Meta cumplida",
  amarillo: "Avanzado",
  naranja: "Insuficiente",
  rojo: "Sin registro",
};
