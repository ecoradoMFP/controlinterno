// Punto único para la validación de formato de los números de documento de la DAI.
//
// La DAI confirmó (2026-10-01) que los formatos de nombramiento no siempre son los mismos
// (`NAI-001-2026`, `DAI-DAF-SR-CAI-01-2026`, `DAI-DAAP-DABAF-01-2026`, ...). Por eso hoy el
// campo queda abierto: lista vacía = se acepta cualquier valor no vacío. Cuando se definan los
// formatos oficiales, basta con agregarlos aquí (y, si se quiere reforzar en la base, el mismo
// patrón como CHECK en `actividades.no_nombramiento`).
export const FORMATOS_NOMBRAMIENTO: readonly { patron: RegExp; ejemplo: string }[] = [];

export const LARGO_MAXIMO_NUMERO = 80;

export function formatoNombramientoValido(valor: string): boolean {
  if (FORMATOS_NOMBRAMIENTO.length === 0) return true;
  return FORMATOS_NOMBRAMIENTO.some((f) => f.patron.test(valor));
}

export function mensajeFormatoNombramiento(): string {
  return `Formato esperado: ${FORMATOS_NOMBRAMIENTO.map((f) => f.ejemplo).join(", ")}`;
}
