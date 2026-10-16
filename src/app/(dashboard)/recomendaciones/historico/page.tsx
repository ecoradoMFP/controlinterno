import { redirect } from "next/navigation";

export default function HistoricoPage() {
  redirect("/recomendaciones?etapa=atendida");
}
