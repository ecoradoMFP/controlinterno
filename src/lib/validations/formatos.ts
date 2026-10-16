export const FORMATOS_NOMBRAMIENTO: readonly { patron: RegExp; ejemplo: string }[] = [];

export const LARGO_MAXIMO_NUMERO = 80;

export function formatoNombramientoValido(valor: string): boolean {
  if (FORMATOS_NOMBRAMIENTO.length === 0) return true;
  return FORMATOS_NOMBRAMIENTO.some((f) => f.patron.test(valor));
}

export function mensajeFormatoNombramiento(): string {
  return `Formato esperado: ${FORMATOS_NOMBRAMIENTO.map((f) => f.ejemplo).join(", ")}`;
}
