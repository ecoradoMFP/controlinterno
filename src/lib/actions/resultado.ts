/**
 * Lo que devuelve una Server Action usada con `FormAccion`: nada si salió bien (la acción solo hace
 * `revalidatePath` y la página se actualiza en su lugar), o el error para mostrarlo junto al
 * formulario.
 */
export type ResultadoAccion = { error: string } | void;

export const errorAccion = (error: string) => ({ error });
