import { redirect } from "next/navigation";

// La lista de nombramientos se absorbió en la página de cada CAI (/recomendaciones/cai/[id]).
export default function DocumentosSeguimientoPage() {
  redirect("/recomendaciones/informes");
}
