import type { ColorSemaforo } from "@/lib/semaforo";

export const HORAS_OBJETIVO_ANUAL = 50;

export function colorCumplimiento(horasAcumuladas: number): ColorSemaforo {
  if (horasAcumuladas <= 0) return "rojo";
  if (horasAcumuladas < HORAS_OBJETIVO_ANUAL / 2) return "naranja";
  if (horasAcumuladas < HORAS_OBJETIVO_ANUAL) return "amarillo";
  return "verde";
}

export function pctCumplimiento(horasAcumuladas: number): number {
  return Math.min(100, (horasAcumuladas / HORAS_OBJETIVO_ANUAL) * 100);
}

export const COLOR_CUMPLIMIENTO_LABELS: Record<ColorSemaforo, string> = {
  verde: "Meta cumplida",
  amarillo: "Avanzado",
  naranja: "Insuficiente",
  rojo: "Sin registro",
};
