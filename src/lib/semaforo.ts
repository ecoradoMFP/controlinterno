// Motor de semáforo — prompt maestro, sección 5.

export type ColorSemaforo = "verde" | "amarillo" | "naranja" | "rojo";

const SEVERIDAD: Record<ColorSemaforo, number> = { verde: 0, amarillo: 1, naranja: 2, rojo: 3 };

export function peorColor(a: ColorSemaforo, b: ColorSemaforo): ColorSemaforo {
  return SEVERIDAD[b] > SEVERIDAD[a] ? b : a;
}

export interface UmbralSemaforo {
  umbral_verde_pct: number;
  umbral_amarillo_pct: number;
  umbral_naranja_pct: number;
}

/** Sección 5: verde ≥50%, amarillo 25-50%, naranja 0-25%, rojo <=0%. Solo se usa si
 * `parametros_semaforo` no tiene fila para el ámbito — los umbrales reales son configurables. */
export const UMBRAL_POR_DEFECTO: UmbralSemaforo = {
  umbral_verde_pct: 50,
  umbral_amarillo_pct: 25,
  umbral_naranja_pct: 0,
};

/**
 * Días hábiles entre dos fechas (inclusive), excluyendo fines de semana y `feriados`.
 * Si `finISO` < `inicioISO`, devuelve el conteo en negativo (transcurridos puede pasarse del
 * plazo). Parseo anclado a UTC para que el día de la semana no dependa de la zona horaria
 * del proceso que ejecuta esto.
 */
function diasHabilesEntre(inicioISO: string, finISO: string, feriados: ReadonlySet<string>): number {
  const inicio = new Date(`${inicioISO}T00:00:00Z`);
  const fin = new Date(`${finISO}T00:00:00Z`);
  const signo = inicio <= fin ? 1 : -1;
  const [desde, hasta] = inicio <= fin ? [inicio, fin] : [fin, inicio];

  let cuenta = 0;
  for (let d = desde; d <= hasta; d = new Date(d.getTime() + 86400000)) {
    const diaSemana = d.getUTCDay();
    if (diaSemana !== 0 && diaSemana !== 6 && !feriados.has(d.toISOString().slice(0, 10))) {
      cuenta++;
    }
  }
  return cuenta * signo;
}

/**
 * Clasifica un hito/oficio abierto (sin fecha de conclusión/respuesta) según el % de plazo
 * hábil restante. Si el rango esperado tiene 0 días hábiles (p. ej. cae todo en feriado), se
 * trata como "sin margen": verde si aún no arrancó, rojo si ya debería haber concluido.
 */
export function calcularSemaforo(
  fechaInicioEsperada: string,
  fechaFinEsperada: string,
  hoyISO: string,
  feriados: ReadonlySet<string>,
  umbral: UmbralSemaforo,
): ColorSemaforo {
  const totales = diasHabilesEntre(fechaInicioEsperada, fechaFinEsperada, feriados);
  const transcurridos = diasHabilesEntre(fechaInicioEsperada, hoyISO, feriados);
  const restantes = totales - transcurridos;
  const pct = totales > 0 ? restantes / totales : transcurridos <= 0 ? 1 : -1;

  if (pct >= umbral.umbral_verde_pct / 100) return "verde";
  if (pct >= umbral.umbral_amarillo_pct / 100) return "amarillo";
  if (pct > umbral.umbral_naranja_pct / 100) return "naranja";
  return "rojo";
}

/** Para hitos/oficios ya concluidos: dato histórico de cumplimiento, no llevan semáforo activo. */
export function cumplidoATiempo(fechaFinEsperada: string, fechaFinReal: string): boolean {
  return fechaFinReal <= fechaFinEsperada;
}

export const COLOR_SEMAFORO_LABELS: Record<ColorSemaforo, string> = {
  verde: "Vamos bien",
  amarillo: "Va apretado",
  naranja: "En riesgo",
  rojo: "No se logra",
};

export const COLOR_SEMAFORO_CLASSES: Record<ColorSemaforo, string> = {
  verde: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  amarillo: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  naranja: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  rojo: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};
