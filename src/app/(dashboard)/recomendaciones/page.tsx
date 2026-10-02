import { VistaRecomendaciones, type FiltrosVista } from "@/components/recomendaciones/vista-recomendaciones";

/** Bandeja única: recomendaciones agrupadas por CAI; por defecto, las que requieren seguimiento. */
export default async function BandejaPage({ searchParams }: { searchParams: Promise<FiltrosVista> }) {
  return <VistaRecomendaciones filtros={await searchParams} />;
}
