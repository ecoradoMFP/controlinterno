import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { departamentosParaNombrarSeguimiento, getUsuarioActual } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SemaforoChip } from "@/components/semaforo-chip";
import { RecomendacionesKpiCards } from "@/components/recomendaciones/kpi-cards";
import { estaAbierta, estaVencida, etiquetaCai, haceCuanto, hoyGuatemala } from "@/lib/recomendaciones";
import { cn } from "@/lib/utils";
import {
  ESTADO_RECOMENDACION_LABELS,
  ESTADO_RECOMENDACION_TONO,
  ESTADOS_RECOMENDACION,
  type EstadoRecomendacionEnum,
} from "@/types/domain";

// "abiertas" es el filtro por defecto: la bandeja existe para dar seguimiento a lo que falta.
const FILTROS_ESTADO: Record<string, string> = {
  abiertas: "Abiertas",
  vencidas: "Vencidas",
  ...Object.fromEntries(ESTADOS_RECOMENDACION.map((e) => [e, ESTADO_RECOMENDACION_LABELS[e]])),
  todas: "Todas",
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
  const estadoFiltro = filtros.estado && filtros.estado in FILTROS_ESTADO ? filtros.estado : "abiertas";
  const hoy = hoyGuatemala();

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  const puedeNombrar = (await departamentosParaNombrarSeguimiento(usuario, supabase)).length > 0;

  // Sin filtro manual de alcance: RLS (recomendaciones_select) ya devuelve solo las
  // recomendaciones de informes visibles para el usuario actual.
  const { data } = await supabase
    .from("recomendaciones")
    .select(
      `id, numero, texto, fecha_implementacion, estado_actual,
       deficiencias(numero, titulo, informes_auditoria(id, no_nombramiento, cai, dependencia_auditada, anio_ejecucion, fecha_informe_final, departamento_id, departamentos(nombre))),
       seguimientos_recomendacion(numero_seguimiento, documentos_seguimiento(no_documento, fecha_documento, no_nombramiento, fecha_nombramiento))`,
    );

  const filas = (data ?? []).flatMap((r) => {
    const informe = r.deficiencias?.informes_auditoria;
    if (!r.deficiencias || !informe) return [];
    const ultimo = [...r.seguimientos_recomendacion]
      .filter((s) => s.documentos_seguimiento)
      .sort((a, b) => b.numero_seguimiento - a.numero_seguimiento)[0];
    return [
      {
        ...r,
        deficiencia: r.deficiencias,
        informe,
        anio: informe.anio_ejecucion ?? (informe.fecha_informe_final ? Number(informe.fecha_informe_final.slice(0, 4)) : null),
        vencida: estaVencida(r.estado_actual, r.fecha_implementacion, hoy),
        ultimoDocumento: ultimo?.documentos_seguimiento ?? null,
        seguimientos: r.seguimientos_recomendacion.filter((s) => s.numero_seguimiento > 0).length,
      },
    ];
  });

  // Opciones de los filtros a partir de lo que el usuario puede ver.
  const dependencias = [...new Set(filas.map((f) => f.informe.dependencia_auditada))].sort();
  const departamentos = [
    ...new Map(filas.map((f) => [f.informe.departamento_id, f.informe.departamentos?.nombre ?? ""])),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const anios = [...new Set(filas.map((f) => f.anio).filter((a): a is number => a !== null))].sort((a, b) => b - a);

  const q = (filtros.q ?? "").trim().toLowerCase();
  const visibles = filas
    .filter((f) => {
      if (estadoFiltro === "abiertas" && !estaAbierta(f.estado_actual)) return false;
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

  const conteo = (estado: EstadoRecomendacionEnum) => filas.filter((f) => f.estado_actual === estado).length;
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
          <Button variant="outline" render={<Link href="/recomendaciones/informes" />}>
            Informes de auditoría
          </Button>
          {puedeNombrar ? (
            <Button render={<Link href="/recomendaciones/documentos/nuevo" />}>Emitir nombramiento de seguimiento</Button>
          ) : null}
        </div>
      </div>

      <RecomendacionesKpiCards
        abiertas={filas.filter((f) => estaAbierta(f.estado_actual)).length}
        vencidas={filas.filter((f) => f.vencida).length}
        noCumplidas={conteo("no_cumplida")}
        cumplidas={conteo("cumplida")}
        total={filas.length}
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

        {visibles.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {filas.length === 0 ? "Ninguna recomendación capturada todavía." : "Ninguna recomendación coincide con los filtros."}
          </p>
        ) : (
          <ul className="divide-y">
            {visibles.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/recomendaciones/${f.id}`}
                  className="grid gap-2 p-4 hover:bg-muted/40 md:grid-cols-[9rem_1fr_14rem] md:gap-4"
                >
                  {/* Único chip: el estado actual. "Vencida" es un plazo, no un estado — va como
                   * texto junto a la fecha de implementación. */}
                  <div>
                    <SemaforoChip tono={ESTADO_RECOMENDACION_TONO[f.estado_actual]} label={ESTADO_RECOMENDACION_LABELS[f.estado_actual]} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      <span className="codigo-expediente font-medium text-foreground">
                        {[etiquetaCai(f.informe.cai), f.informe.no_nombramiento].filter(Boolean).join(" · ")}
                      </span>{" "}
                      · {f.informe.dependencia_auditada}
                    </p>
                    <p className="mt-0.5 text-sm font-medium">
                      Def. {f.deficiencia.numero} · {f.deficiencia.titulo}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{f.texto}</p>
                  </div>
                  <div className="flex flex-col gap-0.5 text-xs text-muted-foreground md:text-right">
                    {f.ultimoDocumento ? (
                      <>
                        <span>
                          Últ. seguimiento:{" "}
                          <span className="codigo-expediente text-foreground">
                            {f.ultimoDocumento.no_documento ??
                              (f.ultimoDocumento.no_nombramiento ? `Nombramiento ${f.ultimoDocumento.no_nombramiento}` : "en elaboración")}
                          </span>
                        </span>
                        {f.ultimoDocumento.fecha_documento ?? f.ultimoDocumento.fecha_nombramiento ? (
                          <span>{haceCuanto((f.ultimoDocumento.fecha_documento ?? f.ultimoDocumento.fecha_nombramiento)!, hoy)}</span>
                        ) : null}
                      </>
                    ) : (
                      <span>Sin seguimiento todavía</span>
                    )}
                    {f.fecha_implementacion && estaAbierta(f.estado_actual) ? (
                      <span className={cn(f.vencida && "font-medium text-destructive")}>
                        {f.vencida ? "Vencida · debía implementarse el" : "Implementar antes de:"} {f.fecha_implementacion}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
