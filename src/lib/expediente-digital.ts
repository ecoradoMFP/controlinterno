// Expediente digital: ubicación de los archivos de cada auditoría, documento, oficio o informe.
//
// SCIDAI todavía no guarda los archivos (prompt maestro, 12.7). Lo que sí guarda desde ya es la
// RUTA donde vive cada archivo, RELATIVA a una carpeta raíz de expedientes. La raíz no está en la
// base: se configura con `SCIDAI_RUTA_BASE_EXPEDIENTES` (hoy la carpeta compartida; mañana el NAS
// o el servidor de la DTI). Cambiar de servidor es cambiar esa variable, no reescribir filas.
//
// Mismas reglas que la función SQL `ruta_expediente_valida`: separador `/`, sin unidad (C:), sin
// UNC (\\servidor), sin raíz (/) y sin `..`.

const LARGO_MAXIMO_RUTA = 500;
const CARACTERES_INVALIDOS_WINDOWS = /[<>:"|?*]/g;

export function rutaBaseExpedientes(): string | null {
  const base = process.env.SCIDAI_RUTA_BASE_EXPEDIENTES?.trim();
  return base ? base : null;
}

export type RutaNormalizada = { ok: true; ruta: string | null } | { ok: false; error: string };

/**
 * Convierte lo que el usuario pegó (con `\` o `/`, con o sin la raíz configurada) en la ruta
 * relativa que se guarda. Vacío = sin ruta.
 */
export function normalizarRutaExpediente(entrada: string | null | undefined): RutaNormalizada {
  let ruta = (entrada ?? "").trim();
  if (!ruta) return { ok: true, ruta: null };

  const base = rutaBaseExpedientes();
  if (base) {
    const baseUnificada = base.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
    const rutaUnificada = ruta.replace(/\\/g, "/");
    if (rutaUnificada.toLowerCase().startsWith(`${baseUnificada}/`)) {
      ruta = rutaUnificada.slice(baseUnificada.length + 1);
    }
  }

  ruta = ruta.replace(/\\/g, "/");
  if (/^\/|^[A-Za-z]:/.test(ruta)) {
    return {
      ok: false,
      error: base
        ? `La ruta debe estar dentro de ${base} (escríbela relativa a esa carpeta).`
        : "Escribe la ruta relativa a la carpeta de expedientes, sin unidad ni servidor (ej. Auditorias/2026/DAF/NAI-001-2026).",
    };
  }

  ruta = ruta.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  if (ruta.split("/").some((segmento) => segmento === "..")) {
    return { ok: false, error: "La ruta no puede contener «..»." };
  }
  if (ruta.length > LARGO_MAXIMO_RUTA) {
    return { ok: false, error: `La ruta no puede tener más de ${LARGO_MAXIMO_RUTA} caracteres.` };
  }
  return { ok: true, ruta: ruta || null };
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

function segmentoSeguro(texto: string): string {
  return texto.trim().replace(/[\\/]/g, "-").replace(CARACTERES_INVALIDOS_WINDOWS, "").replace(/\s+/g, " ");
}

/** Siglas usadas en los números de oficio y nombramiento (DAI-DAF-..., DAI-DAAP-..., DAI-DAE-...). */
export function siglaDepartamento(nombre: string | null | undefined): string | null {
  if (!nombre) return null;
  const n = nombre.toLowerCase();
  if (n.includes("financier")) return "DAF";
  if (n.includes("administrativ")) return "DAAP";
  if (n.includes("especial")) return "DAE";
  return nombre;
}

/** Convención sugerida de carpetas: Auditorias/<año>/<departamento>/<nombramiento>. */
export function sugerirRutaExpediente({
  noNombramiento,
  fecha,
  departamento,
}: {
  noNombramiento: string;
  fecha: string | null;
  departamento: string | null;
}): string {
  const anio = (fecha ?? new Date().toISOString()).slice(0, 4);
  const partes = ["Auditorias", anio];
  const sigla = siglaDepartamento(departamento);
  if (sigla) partes.push(segmentoSeguro(sigla));
  partes.push(segmentoSeguro(noNombramiento));
  return partes.join("/");
}
