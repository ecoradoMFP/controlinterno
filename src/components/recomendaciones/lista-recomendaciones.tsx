import Link from "next/link";
import { SemaforoChip } from "@/components/semaforo-chip";
import { etiquetaCai, haceCuanto, hoyGuatemala } from "@/lib/recomendaciones";
import type { FilaRecomendacion } from "@/lib/recomendaciones-datos";
import { cn } from "@/lib/utils";
import { ESTADO_RECOMENDACION_LABELS, ESTADO_RECOMENDACION_TONO } from "@/types/domain";

/**
 * Fila de recomendación reutilizada por los 3 paneles (bandeja principal, en seguimiento,
 * histórico de atendidas): lo único que cambia entre ellos es el texto de la columna derecha,
 * según `contexto`.
 */
export function ListaRecomendaciones({
  filas,
  contexto,
}: {
  filas: FilaRecomendacion[];
  contexto: "activa" | "en_seguimiento" | "atendida";
}) {
  const hoy = hoyGuatemala();

  if (filas.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Ninguna recomendación coincide con los filtros.</p>;
  }

  return (
    <ul className="divide-y">
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
