import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { departamentosParaNombrarSeguimiento, getUsuarioActual } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecomendacionesKpiCards } from "@/components/recomendaciones/kpi-cards";
import { ListaRecomendaciones } from "@/components/recomendaciones/lista-recomendaciones";
import { cargarDocumentosSeguimiento, cargarRecomendaciones } from "@/lib/recomendaciones-datos";
import { cn } from "@/lib/utils";
import { ESTADOS_RECOMENDACION, ESTADO_RECOMENDACION_LABELS, type EstadoRecomendacionEnum } from "@/types/domain";

// "activas" es el filtro por defecto: la bandeja existe para dar seguimiento a lo que falta. Las
// cumplidas y las ya evaluadas este año viven en /recomendaciones/historico y
// /recomendaciones/en-seguimiento — por eso no hay aquí ni "cumplida" ni un "todas" que las
// incluya (sería idéntico a "activas").
const FILTROS_ESTADO: Record<string, string> = {
  activas: "Activas",
  vencidas: "Vencidas",
  ...Object.fromEntries(
    ESTADOS_RECOMENDACION.filter((e) => e !== "cumplida").map((e) => [e, ESTADO_RECOMENDACION_LABELS[e]]),
  ),
};

type Filtros = { estado?: string; dependencia?: string; departamento?: string; anio?: string; q?: string };

function urlConFiltros(actuales: Filtros, cambios: Filtros) {
  const params = new URLSearchParams(
    Object.entries({ ...actuales, ...cambios }).filter((e): e is [string, string] => !!e[1]),
  );
  return `/recomendaciones?${params.toString()}`;
}

const SELECT_CLASES =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function BandejaRecomendacionesPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  const estadoFiltro = filtros.estado && filtros.estado in FILTROS_ESTADO ? filtros.estado : "activas";

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  const [puedeNombrar, todasLasFilas, documentos] = await Promise.all([
    departamentosParaNombrarSeguimiento(usuario, supabase).then((deps) => deps.length > 0),
    cargarRecomendaciones(supabase),
    cargarDocumentosSeguimiento(supabase),
  ]);
  const documentosPorCompletar = documentos.filter((d) => d.paso !== "completo").length;

  // Esta bandeja solo muestra lo "activo": las cumplidas y las ya evaluadas este año viven en
  // /recomendaciones/historico y /recomendaciones/en-seguimiento (ver ubicarRecomendacion).
  const filas = todasLasFilas.filter((f) => f.bucket === "activa");

  // Opciones de los filtros a partir de lo que el usuario puede ver.
  const dependencias = [...new Set(filas.map((f) => f.informe.dependencia_auditada))].sort();
  const departamentos = [
    ...new Map(filas.map((f) => [f.informe.departamento_id, f.informe.departamentos?.nombre ?? ""])),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const anios = [...new Set(filas.map((f) => f.anio).filter((a): a is number => a !== null))].sort((a, b) => b - a);

  const q = (filtros.q ?? "").trim().toLowerCase();
  const visibles = filas
    .filter((f) => {
      if (estadoFiltro === "vencidas" && !f.vencida) return false;
      if (ESTADOS_RECOMENDACION.includes(estadoFiltro as EstadoRecomendacionEnum) && f.estado_actual !== estadoFiltro) {
        return false;
      }
      if (filtros.dependencia && f.informe.dependencia_auditada !== filtros.dependencia) return false;
      if (filtros.departamento && f.informe.departamento_id !== filtros.departamento) return false;
      if (filtros.anio && String(f.anio) !== filtros.anio) return false;
      if (q) {
        const texto = [f.informe.cai, f.informe.no_nombramiento, f.deficiencia.titulo, f.texto].join(" ").toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    })
    // Vencidas primero, luego por fecha de implementación más próxima.
    .sort(
      (a, b) =>
        Number(b.vencida) - Number(a.vencida) ||
        (a.fecha_implementacion ?? "9999").localeCompare(b.fecha_implementacion ?? "9999"),
    );

  const hayFiltros = !!(filtros.dependencia || filtros.departamento || filtros.anio || q);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Seguimiento a recomendaciones</h1>
          <p className="text-sm text-muted-foreground">
            Cada recomendación se sigue, informe tras informe, hasta que queda cumplida.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/recomendaciones/documentos" />}>
            Nombramientos e informes de seguimiento
          </Button>
          <Button variant="outline" render={<Link href="/recomendaciones/en-seguimiento" />}>
            En seguimiento
          </Button>
          <Button variant="outline" render={<Link href="/recomendaciones/historico" />}>
            Histórico de atendidas
          </Button>
          <Button variant="outline" render={<Link href="/recomendaciones/informes" />}>
            Informes de auditoría
          </Button>
          {puedeNombrar ? (
            <Button render={<Link href="/recomendaciones/documentos/nuevo" />}>Emitir nombramiento de seguimiento</Button>
          ) : null}
        </div>
      </div>

      {documentosPorCompletar > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="text-sm">
            <p className="font-medium">
              {documentosPorCompletar === 1
                ? "Tienes 1 nombramiento de seguimiento por completar"
                : `Tienes ${documentosPorCompletar} nombramientos de seguimiento por completar`}
            </p>
            <p className="text-muted-foreground">Ahí evalúas las recomendaciones, emites el informe y lo cargas al SAG-UDAI.</p>
          </div>
          <Button size="lg" render={<Link href="/recomendaciones/documentos" />}>
            Ver nombramientos por completar
          </Button>
        </div>
      ) : null}

      <RecomendacionesKpiCards
        activas={filas.length}
        vencidas={filas.filter((f) => f.vencida).length}
        enSeguimiento={todasLasFilas.filter((f) => f.bucket === "en_seguimiento").length}
        atendidas={todasLasFilas.filter((f) => f.bucket === "atendida").length}
      />

      <div className="rounded-xl border shadow-sm">
        <form method="get" className="flex flex-col gap-3 border-b p-4">
          <input type="hidden" name="estado" value={estadoFiltro} />
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(FILTROS_ESTADO).map(([valor, label]) => (
              <Link
                key={valor}
                href={urlConFiltros(filtros, { estado: valor })}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  estadoFiltro === valor
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_8rem_1fr_auto]">
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
            <select name="anio" defaultValue={filtros.anio ?? ""} className={SELECT_CLASES} aria-label="Año">
              <option value="">Todos los años</option>
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <Input name="q" defaultValue={filtros.q ?? ""} placeholder="Buscar CAI, nombramiento o texto" />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="h-8">
                Filtrar
              </Button>
              {hayFiltros ? (
                <Button variant="ghost" size="sm" className="h-8" render={<Link href={`/recomendaciones?estado=${estadoFiltro}`} />}>
                  Limpiar
                </Button>
              ) : null}
            </div>
          </div>
        </form>

        {filas.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Ninguna recomendación activa por ahora.</p>
        ) : (
          <ListaRecomendaciones filas={visibles} contexto="activa" />
        )}
      </div>
    </div>
  );
}
