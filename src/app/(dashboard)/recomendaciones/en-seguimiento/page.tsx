import { redirect } from "next/navigation";

// Ahora es un filtro de etapa en la bandeja.
export default function EnSeguimientoPage() {
  redirect("/recomendaciones?etapa=en_seguimiento");
}
