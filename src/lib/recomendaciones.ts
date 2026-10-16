import type { EstadoRecomendacionEnum } from "@/types/domain";

export function hoyGuatemala(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(new Date());
}

export function haceCuanto(fecha: string, hoy: string = hoyGuatemala()): string {
  const dias = Math.round((Date.parse(hoy) - Date.parse(fecha)) / 86_400_000);
  if (dias < 0) return "fecha futura";
  if (dias < 60) return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
  const meses = Math.floor(dias / 30.44);
  return `hace ${meses} meses`;
}

export function etiquetaCai(cai: string | null, anio?: number | null): string | null {
  if (!cai) return null;
  const base = /^cai/i.test(cai) ? cai : `CAI ${cai}`;
  return anio ? `${base}-${anio}` : base;
}

export type BucketRecomendacion = "activa" | "en_seguimiento" | "atendida";

type SeguimientoParaBucket = {
  numero_seguimiento: number;
  estado: EstadoRecomendacionEnum;
  documentos_seguimiento: { no_documento: string | null; fecha_documento: string | null } | null;
};

export function ubicarRecomendacion(
  seguimientos: SeguimientoParaBucket[],
  hoy: string = hoyGuatemala(),
): { bucket: BucketRecomendacion; anio: number | null } {
  const ultimoEmitido = seguimientos
    .filter((s) => s.numero_seguimiento > 0 && s.documentos_seguimiento?.no_documento)
    .sort((a, b) => b.numero_seguimiento - a.numero_seguimiento)[0];
  if (!ultimoEmitido) return { bucket: "activa", anio: null };

  const anio = Number(ultimoEmitido.documentos_seguimiento!.fecha_documento!.slice(0, 4));
  if (ultimoEmitido.estado === "cumplida") return { bucket: "atendida", anio };
  return { bucket: anio === Number(hoy.slice(0, 4)) ? "en_seguimiento" : "activa", anio };
}

export type PasoCai = "capturar" | "nombramiento" | "evaluar" | "emitir" | "sag" | "al_dia";

export const PASO_CAI_FALTA: Record<PasoCai, string> = {
  capturar: "Faltan las recomendaciones emitidas",
  nombramiento: "Falta registrar el nombramiento de seguimiento",
  evaluar: "Falta completar la cédula de seguimiento",
  emitir: "Falta la emisión del informe",
  sag: "Falta cargar el informe al SAG-UDAI",
  al_dia: "Al día",
};

export function pasoDelCai(args: {
  tieneRecomendaciones: boolean;
  hayActivas: boolean;
  pasoDocumento: "evaluar" | "emitir" | "sag" | null;
}): PasoCai {
  if (!args.tieneRecomendaciones) return "capturar";
  if (args.pasoDocumento) return args.pasoDocumento;
  return args.hayActivas ? "nombramiento" : "al_dia";
}

export type EtapaRecomendacion = "por_evaluar" | "evaluada" | "en_seguimiento" | "atendida";

export const ETAPA_LABELS: Record<EtapaRecomendacion, string> = {
  por_evaluar: "Por evaluar",
  evaluada: "Evaluada · falta la emisión del informe",
  en_seguimiento: "En seguimiento este año",
  atendida: "Atendida",
};

export const ACCION_PASO: Record<PasoCai, string> = {
  capturar: "Registrar recomendaciones emitidas",
  nombramiento: "Registrar nombramiento",
  evaluar: "Completar cédula",
  emitir: "Emitir informe",
  sag: "Registrar carga al SAG-UDAI",
  al_dia: "Ver CAI",
};
