import type { TipoPermisoPersonalEnum } from "@/types/domain";

export const TIPOS_PERMISO: TipoPermisoPersonalEnum[] = [
  "asunto_personal",
  "cita_medica",
  "entrada_tardia",
  "comision_oficial",
  "nota_marcaje",
];

export const TIPO_PERMISO_LABELS: Record<TipoPermisoPersonalEnum, string> = {
  asunto_personal: "Permiso personal",
  cita_medica: "Cita médica",
  entrada_tardia: "Entrada tardía",
  comision_oficial: "Comisión oficial",
  nota_marcaje: "Nota de marcaje",
};

export const TIPO_PERMISO_AYUDA: Record<TipoPermisoPersonalEnum, string> = {
  asunto_personal: "Asuntos personales, centro educativo de los hijos, útiles escolares, votación, trámites.",
  cita_medica: "IGSS, médico particular, clínicas, dentista, oftalmólogo.",
  entrada_tardia: "Se cuenta desde las 8:00 hasta la hora en que marcó su entrada.",
  comision_oficial: "Comisiones y capacitaciones oficiales fuera de la oficina. Se anota, pero no suma horas de permiso.",
  nota_marcaje: "Falta o exceso de marcaje. Solo queda la constancia, sin horario.",
};

export const MOTIVO_POR_DEFECTO: Record<TipoPermisoPersonalEnum, string> = {
  asunto_personal: "Asuntos personales",
  cita_medica: "Cita médica",
  entrada_tardia: "Nota por entrada tardía",
  comision_oficial: "Comisión oficial",
  nota_marcaje: "Nota por falta de marcaje",
};

export const CATEGORIAS_TIEMPO = ["asunto_personal", "cita_medica", "entrada_tardia"] as const;
export type CategoriaTiempo = (typeof CATEGORIAS_TIEMPO)[number];

export const CATEGORIA_TITULO: Record<CategoriaTiempo, string> = {
  asunto_personal: "Permisos personales (horas en el mes)",
  cita_medica: "Citas médicas",
  entrada_tardia: "Entradas tarde",
};

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export const JORNADA_INICIO = "08:00";
export const JORNADA_FIN = "16:30";

export function formatearMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function formatearFechaPermiso(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const nombre = DIAS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  return `${nombre} ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}

export function cantidad(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function formatearHora(hora: string | null): string {
  if (!hora) return "";
  const [h, m] = hora.split(":");
  return `${Number(h)}:${m}`;
}

export type RegistroResumen = {
  usuario_nit: string;
  tipo: TipoPermisoPersonalEnum;
  minutos: number | null;
  mes: number | null;
};

export type Totales = {
  minutos: Record<CategoriaTiempo, number>;
  veces: Record<TipoPermisoPersonalEnum, number>;
};

export function totalesVacios(): Totales {
  return {
    minutos: { asunto_personal: 0, cita_medica: 0, entrada_tardia: 0 },
    veces: { asunto_personal: 0, cita_medica: 0, entrada_tardia: 0, comision_oficial: 0, nota_marcaje: 0 },
  };
}

export function sumarRegistro(t: Totales, r: Pick<RegistroResumen, "tipo" | "minutos">) {
  t.veces[r.tipo] += 1;
  if ((CATEGORIAS_TIEMPO as readonly string[]).includes(r.tipo)) {
    t.minutos[r.tipo as CategoriaTiempo] += r.minutos ?? 0;
  }
}

export function totalesPor<K>(registros: RegistroResumen[], clave: (r: RegistroResumen) => K): Map<K, Totales> {
  const mapa = new Map<K, Totales>();
  for (const r of registros) {
    const k = clave(r);
    let t = mapa.get(k);
    if (!t) mapa.set(k, (t = totalesVacios()));
    sumarRegistro(t, r);
  }
  return mapa;
}

export function minutosPorMes(registros: RegistroResumen[], categoria: CategoriaTiempo): number[] {
  const meses = Array<number>(12).fill(0);
  for (const r of registros) {
    if (r.tipo === categoria && r.mes) meses[r.mes - 1] += r.minutos ?? 0;
  }
  return meses;
}
