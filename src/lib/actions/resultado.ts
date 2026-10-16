export type ResultadoAccion = { error: string } | void;

export const errorAccion = (error: string) => ({ error });
