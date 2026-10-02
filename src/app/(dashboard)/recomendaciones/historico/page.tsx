import { redirect } from "next/navigation";

// Ahora es un filtro de etapa en la bandeja.
export default function HistoricoPage() {
  redirect("/recomendaciones?etapa=atendida");
}
