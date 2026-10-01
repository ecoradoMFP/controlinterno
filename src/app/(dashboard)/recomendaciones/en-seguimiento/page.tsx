import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListaRecomendaciones } from "@/components/recomendaciones/lista-recomendaciones";
import { cargarRecomendaciones } from "@/lib/recomendaciones-datos";

type Filtros = { dependencia?: string; departamento?: string; q?: string };

const SELECT_CLASES =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/**
 * Recomendaciones que ya recibieron un seguimiento emitido este año pero no quedaron cumplidas:
 * no tiene sentido pedirles acción de nuevo hasta el próximo año calendario (ver
 * ubicarRecomendacion en src/lib/recomendaciones.ts), así que no se mezclan con la bandeja
 * principal de "Activas".
 */
export default async function EnSeguimientoPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  const supabase = await createClient();

  const todas = await cargarRecomendaciones(supabase);
  const filas = todas.filter((f) => f.bucket === "en_seguimiento");

  const dependencias = [...new Set(filas.map((f) => f.informe.dependencia_auditada))].sort();
  const departamentos = [
    ...new Map(filas.map((f) => [f.informe.departamento_id, f.informe.departamentos?.nombre ?? ""])),
  ].sort((a, b) => a[1].localeCompare(b[1]));

  const q = (filtros.q ?? "").trim().toLowerCase();
  const visibles = filas.filter((f) => {
    if (filtros.dependencia && f.informe.dependencia_auditada !== filtros.dependencia) return false;
    if (filtros.departamento && f.informe.departamento_id !== filtros.departamento) return false;
    if (q) {
      const texto = [f.informe.cai, f.informe.no_nombramiento, f.deficiencia.titulo, f.texto].join(" ").toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  });

  const hayFiltros = !!(filtros.dependencia || filtros.departamento || q);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/recomendaciones" label="Volver a la bandeja de recomendaciones" />

      <div>
        <h1 className="text-xl font-semibold">En seguimiento</h1>
        <p className="text-sm text-muted-foreground">
          Ya se les dio seguimiento este año y no quedaron cumplidas. Vuelven a la bandeja principal al iniciar el
          próximo año calendario.
        </p>
      </div>

      <div className="rounded-xl border shadow-sm">
        <form method="get" className="flex flex-col gap-3 border-b p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <select name="dependencia" defaultValue={filtros.dependencia ?? ""} className={SELECT_CLASES} aria-label="Dependencia">
              <option value="">Todas las dependencias</option>
              {dependencias.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select name="departamento" defaultValue={filtros.departamento ?? ""} className={SELECT_CLASES} aria-label="Departamento">
              <option value="">Todos los departamentos</option>
              {departamentos.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
            <Input name="q" defaultValue={filtros.q ?? ""} placeholder="Buscar CAI, nombramiento o texto" />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="h-8">
                Filtrar
              </Button>
              {hayFiltros ? (
                <Button variant="ghost" size="sm" className="h-8" render={<Link href="/recomendaciones/en-seguimiento" />}>
                  Limpiar
                </Button>
              ) : null}
            </div>
          </div>
        </form>

        <ListaRecomendaciones filas={visibles} contexto="en_seguimiento" />
      </div>
    </div>
  );
}
