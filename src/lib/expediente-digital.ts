export const MOSTRAR_RUTAS_EXPEDIENTE = false;

export function rutaBaseExpedientes(): string | null {
  const base = process.env.SCIDAI_RUTA_BASE_EXPEDIENTES?.trim();
  return base ? base : null;
}

export function rutaCompletaExpediente(rutaRelativa: string | null): string | null {
  if (!rutaRelativa) return null;
  const base = rutaBaseExpedientes();
  if (!base) return rutaRelativa;
  const separador = base.includes("\\") ? "\\" : "/";
  const relativa = separador === "\\" ? rutaRelativa.replace(/\//g, "\\") : rutaRelativa;
  return `${base.replace(/[\\/]+$/, "")}${separador}${relativa}`;
}
