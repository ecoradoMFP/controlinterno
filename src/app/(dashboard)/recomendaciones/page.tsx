import { VistaRecomendaciones, type FiltrosVista } from "@/components/recomendaciones/vista-recomendaciones";

export default async function BandejaPage({ searchParams }: { searchParams: Promise<FiltrosVista> }) {
  return <VistaRecomendaciones filtros={await searchParams} />;
}
