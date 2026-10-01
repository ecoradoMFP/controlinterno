// Expediente digital: ubicación de los archivos de cada auditoría, documento, oficio o informe.
//
// SCIDAI todavía no guarda los archivos (prompt maestro, 12.7). Lo que sí guarda desde ya es la
// RUTA donde vive cada archivo, RELATIVA a una carpeta raíz de expedientes. La raíz no está en la
// base: se configura con `SCIDAI_RUTA_BASE_EXPEDIENTES` (hoy la carpeta compartida; mañana el NAS
// o el servidor de la DTI). Cambiar de servidor es cambiar esa variable, no reescribir filas.
//
// Las rutas relativas las asigna la base de datos por correlativo (triggers de actividades,
// documentos y oficios): nadie las escribe a mano. Aquí solo se arma la ruta completa para mostrar.

export function rutaBaseExpedientes(): string | null {
  const base = process.env.SCIDAI_RUTA_BASE_EXPEDIENTES?.trim();
  return base ? base : null;
}

/** Ruta completa para mostrar y copiar: raíz configurada + ruta relativa. */
export function rutaCompletaExpediente(rutaRelativa: string | null): string | null {
  if (!rutaRelativa) return null;
  const base = rutaBaseExpedientes();
  if (!base) return rutaRelativa;
  const separador = base.includes("\\") ? "\\" : "/";
  const relativa = separador === "\\" ? rutaRelativa.replace(/\//g, "\\") : rutaRelativa;
  return `${base.replace(/[\\/]+$/, "")}${separador}${relativa}`;
}
