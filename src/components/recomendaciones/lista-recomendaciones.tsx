import Link from "next/link";
import { SemaforoChip } from "@/components/semaforo-chip";
import { etiquetaCai, haceCuanto, hoyGuatemala } from "@/lib/recomendaciones";
import type { FilaRecomendacion } from "@/lib/recomendaciones-datos";
import { cn } from "@/lib/utils";
import { ESTADO_RECOMENDACION_LABELS, ESTADO_RECOMENDACION_TONO, ESTADOS_RECOMENDACION } from "@/types/domain";

type Contexto = "activa" | "en_seguimiento" | "atendida";

/**
 * Los 3 paneles (bandeja principal, en seguimiento, histórico de atendidas) agrupan por CAI, que
 * es el identificador principal de cada auditoría: cada CAI es un desplegable con su resumen y,
 * dentro, las recomendaciones. Respeta el orden en que llegan las filas (el primer CAI es el de
 * la primera fila). Lo único que cambia entre paneles es la columna derecha, según `contexto`.
 */
export function ListaRecomendaciones({ filas, contexto }: { filas: FilaRecomendacion[]; contexto: Contexto }) {
  if (filas.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Ninguna recomendación coincide con los filtros.</p>;
  }

  const grupos = new Map<string, FilaRecomendacion[]>();
  for (const f of filas) {
    const lista = grupos.get(f.informe.id) ?? [];
    lista.push(f);
    grupos.set(f.informe.id, lista);
  }

  return (
    <div className="divide-y">
      {[...grupos.values()].map((grupo) => (
        <GrupoCai key={grupo[0].informe.id} filas={grupo} contexto={contexto} abierto={grupos.size === 1} />
      ))}
    </div>
  );
}

function GrupoCai({ filas, contexto, abierto }: { filas: FilaRecomendacion[]; contexto: Contexto; abierto: boolean }) {
  const { informe } = filas[0];
  const vencidas = filas.filter((f) => f.vencida).length;
  const porEstado = ESTADOS_RECOMENDACION.map((e) => [e, filas.filter((f) => f.estado_actual === e).length] as const).filter(
    ([, n]) => n > 0,
  );

  return (
    <details open={abierto} className="group">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">
          ▶
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">
            <Link
              href={`/recomendaciones/cai/${informe.id}`}
              title="Abrir el CAI y darle seguimiento"
              className="codigo-expediente text-primary underline-offset-4 hover:underline"
            >
              {etiquetaCai(informe.cai) ?? informe.no_nombramiento}
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            {informe.dependencia_auditada}
            {informe.no_nombramiento ? ` · Nombramiento ${informe.no_nombramiento}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {filas.length} {filas.length === 1 ? "recomendación" : "recomendaciones"}
          </span>
          {porEstado.map(([e, n]) => (
            <span key={e}>
              {n} {ESTADO_RECOMENDACION_LABELS[e].toLowerCase()}
            </span>
          ))}
          {vencidas > 0 ? <span className="font-medium text-destructive">{vencidas} vencida(s)</span> : null}
        </div>
      </summary>
      <FilasRecomendacion filas={filas} contexto={contexto} />
    </details>
  );
}

export function FilasRecomendacion({ filas, contexto }: { filas: FilaRecomendacion[]; contexto: Contexto }) {
  const hoy = hoyGuatemala();

  return (
    <ul className="divide-y border-t bg-muted/20">
      {filas.map((f) => (
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
              <p className="text-sm font-medium">
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

              {/* Puede quedar en "activa" ya con estado_actual "cumplida": el resultado se
               * registró, pero el documento que lo formaliza todavía está en elaboración — el
               * cambio de panel espera a que se emita (ver ubicarRecomendacion). Sin este aviso
               * parece que el sistema no reconoció el cambio. */}
              {contexto === "activa" && f.estado_actual === "cumplida" ? (
                <span className="font-medium text-foreground">Pasará al histórico al emitirse el documento</span>
              ) : contexto === "activa" && f.fecha_implementacion ? (
                <span className={cn(f.vencida && "font-medium text-destructive")}>
                  {f.vencida ? "Vencida · debía implementarse el" : "Implementar antes de:"} {f.fecha_implementacion}
                </span>
              ) : null}

              {contexto === "en_seguimiento" && f.anioBucket ? (
                <span>Vuelve a la bandeja principal en {f.anioBucket + 1}</span>
              ) : null}

              {contexto === "atendida" && f.anioBucket ? <span>Atendida en {f.anioBucket}</span> : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
