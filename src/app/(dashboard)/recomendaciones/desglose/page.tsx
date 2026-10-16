import { redirect } from "next/navigation";

export default async function DesglosePage({ searchParams }: { searchParams: Promise<{ etapa?: string }> }) {
  const { etapa } = await searchParams;
  redirect(`/recomendaciones?etapa=${etapa || "todas"}`);
}
