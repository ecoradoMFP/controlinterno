import Link from "next/link";
import { Download } from "lucide-react";
import { hoyGuatemala } from "@/lib/recomendaciones";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { MatrizMeses, type FilaMatriz } from "@/components/permisos/matriz-meses";
import { CATEGORIAS_TIEMPO, CATEGORIA_TITULO, minutosPorMes } from "@/lib/permisos";
import { accesoPermisos, cargarPersonal } from "../datos";

export default async function ResumenPermisosPage({ searchParams }: { searchParams: Promise<{ anio?: string }> }) {
  const { anio: anioParam } = await searchParams;
  const { supabase } = await accesoPermisos();

  const anioActual = Number(hoyGuatemala().slice(0, 4));
  const anio = Number(anioParam) || anioActual;

  const [{ grupoDe, grupos }, { data: registros }] = await Promise.all([
    cargarPersonal(supabase),
    supabase.from("permisos_personal").select("usuario_nit, tipo, minutos, mes").eq("anio", anio),
  ]);
  const lista = (registros ?? []).filter((r) => grupoDe.has(r.usuario_nit));

  const filas = (categoria: (typeof CATEGORIAS_TIEMPO)[number]): FilaMatriz[] =>
    grupos.map((g) => ({
      clave: g,
      etiqueta: g,
      href: `/permisos?anio=${anio}&grupo=${encodeURIComponent(g)}`,
      minutos: minutosPorMes(
        lista.filter((r) => grupoDe.get(r.usuario_nit) === g),
        categoria,
      ),
    }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BackLink href={`/permisos?anio=${anio}`} label="Volver a Permisos" />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Resumen por mes · {anio}</h1>
          <p className="text-sm text-muted-foreground">Horas por mes de cada área, como en el Excel de Dirección. Haga clic en un área para ver a su personal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[anioActual, anioActual - 1, anioActual - 2].map((a) => (
            <Button key={a} variant={a === anio ? "default" : "outline"} nativeButton={false} render={<Link href={`/permisos/resumen?anio=${a}`} />}>
              {a}
            </Button>
          ))}
          <Button variant="outline" nativeButton={false} render={<a href={`/permisos/reporte?anio=${anio}`} />}>
            <Download />
            Descargar Excel
          </Button>
        </div>
      </div>
      {CATEGORIAS_TIEMPO.map((c) => (
        <MatrizMeses key={c} titulo={CATEGORIA_TITULO[c]} filas={filas(c)} etiquetaFila="Área" />
      ))}
    </div>
  );
}
