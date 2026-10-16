export type ColorSemaforo = "verde" | "amarillo" | "naranja" | "rojo";

export const SEVERIDAD: Record<ColorSemaforo, number> = { verde: 0, amarillo: 1, naranja: 2, rojo: 3 };

export function peorColor(a: ColorSemaforo, b: ColorSemaforo): ColorSemaforo {
  return SEVERIDAD[b] > SEVERIDAD[a] ? b : a;
}

export interface UmbralSemaforo {
  umbral_verde_pct: number;
  umbral_amarillo_pct: number;
  umbral_naranja_pct: number;
}

export const UMBRAL_POR_DEFECTO: UmbralSemaforo = {
  umbral_verde_pct: 50,
  umbral_amarillo_pct: 25,
  umbral_naranja_pct: 0,
};

export function diasHabilesEntre(inicioISO: string, finISO: string, feriados: ReadonlySet<string>): number {
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

export function sumarDiasHabiles(desdeISO: string, dias: number, feriados: ReadonlySet<string>): string {
  let d = new Date(`${desdeISO}T00:00:00Z`);
  let cuenta = 0;
  while (cuenta < dias) {
    d = new Date(d.getTime() + 86400000);
    const iso = d.toISOString().slice(0, 10);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !feriados.has(iso)) cuenta++;
  }
  return d.toISOString().slice(0, 10);
}

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

export function cumplidoATiempo(fechaFinEsperada: string, fechaFinReal: string): boolean {
  return fechaFinReal <= fechaFinEsperada;
}

export interface HitoAbiertoParaSemaforo {
  actividad_id: string | null;
  fecha_inicio_esperada: string;
  fecha_fin_esperada: string;
}

export function calcularColorPorActividad(
  hitosAbiertos: readonly HitoAbiertoParaSemaforo[],
  hoy: string,
  feriados: ReadonlySet<string>,
  umbralHito: UmbralSemaforo,
): Map<string, ColorSemaforo> {
  return new Map(
    [...semaforoConMotivoPorActividad(hitosAbiertos.map((h) => ({ ...h, nombre: "" })), hoy, feriados, umbralHito)].map(
      ([id, p]) => [id, p.color],
    ),
  );
}

export interface SemaforoConMotivo {
  color: ColorSemaforo;
  motivo: string;
  fecha: string;
}

export function semaforoConMotivoPorActividad(
  hitosAbiertos: readonly (HitoAbiertoParaSemaforo & { nombre: string })[],
  hoy: string,
  feriados: ReadonlySet<string>,
  umbralHito: UmbralSemaforo,
): Map<string, SemaforoConMotivo> {
  const peor = new Map<string, SemaforoConMotivo>();
  for (const h of hitosAbiertos) {
    if (!h.actividad_id) continue;
    const color = calcularSemaforo(h.fecha_inicio_esperada, h.fecha_fin_esperada, hoy, feriados, umbralHito);
    const fecha = h.fecha_fin_esperada;
    const actual = peor.get(h.actividad_id);
    if (!actual || SEVERIDAD[color] > SEVERIDAD[actual.color] || (color === actual.color && fecha < actual.fecha)) {
      peor.set(h.actividad_id, {
        color,
        motivo: `La actividad "${h.nombre}" del cronograma ${fecha < hoy ? "venció" : "vence"} el ${fecha}`,
        fecha,
      });
    }
  }
  return peor;
}

export const COLOR_SEMAFORO_LABELS: Record<ColorSemaforo, string> = {
  verde: "En tiempo",
  amarillo: "En riesgo leve",
  naranja: "En riesgo moderado",
  rojo: "Riesgo grave",
};

