/**
 * Subtítulo "Recomendación" sobre el texto de la recomendación, debajo de "Deficiencia N · título".
 * Una deficiencia = una recomendación, así que la recomendación no lleva número propio: se
 * identifica por el de su deficiencia.
 */
export function RotuloRecomendacion() {
  return <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Recomendación</p>;
}
