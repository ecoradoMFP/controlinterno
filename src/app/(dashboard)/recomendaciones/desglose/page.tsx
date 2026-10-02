import { redirect } from "next/navigation";

// La pestaña "Todas" se unió a la bandeja: ahora es el filtro de etapa "Todas".
export default async function DesglosePage({ searchParams }: { searchParams: Promise<{ etapa?: string }> }) {
  const { etapa } = await searchParams;
  redirect(`/recomendaciones?etapa=${etapa || "todas"}`);
}
