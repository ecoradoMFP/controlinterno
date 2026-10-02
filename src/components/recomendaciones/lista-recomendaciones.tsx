import Link from "next/link";
import { SemaforoChip } from "@/components/semaforo-chip";
import { ACCION_PASO, ETAPA_LABELS, etiquetaCai, haceCuanto, hoyGuatemala, PASO_CAI_FALTA, type PasoCai } from "@/lib/recomendaciones";
import { Button } from "@/components/ui/button";
import type { FilaRecomendacion } from "@/lib/recomendaciones-datos";
import { cn } from "@/lib/utils";
import { ESTADO_RECOMENDACION_LABELS, ESTADO_RECOMENDACION_TONO, ESTADOS_RECOMENDACION } from "@/types/domain";

const ESTADO_PLURAL = { pendiente: "pendientes", en_proceso: "en proceso", no_cumplida: "no cumplidas", cumplida: "cumplidas" } as const;

type Contexto = "activa" | "en_seguimiento" | "atendida" | "auto";
export type FlujoPorCai = Map<string, { paso: PasoCai; documentoId: string | null }>;

/**
 * Los 3 paneles (bandeja principal, en seguimiento, histórico de atendidas) agrupan por CAI, que
 * es el identificador principal de cada auditoría: cada CAI es un desplegable con su resumen y,
 * dentro, las recomendaciones. Respeta el orden en que llegan las filas (el primer CAI es el de
 * la primera fila). Lo único que cambia entre paneles es la columna derecha, según `contexto`.
 */
export function ListaRecomendaciones({
  filas,
  contexto,
  flujo,
}: {
  filas: FilaRecomendacion[];
  contexto: Contexto;
  flujo?: FlujoPorCai;
}) {
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
        <GrupoCai
          key={grupo[0].informe.id}
          filas={grupo}
          contexto={contexto}
          abierto={grupos.size === 1}
          paso={flujo?.get(grupo[0].informe.id)?.paso}
        />
      ))}
    </div>
  );
}

function GrupoCai({
  filas,
  contexto,
  abierto,
  paso,
}: {
  filas: FilaRecomendacion[];
  contexto: Contexto;
  abierto: boolean;
  paso?: PasoCai;
}) {
  const { informe } = filas[0];
  const vencidas = filas.filter((f) => f.vencida).length;
  const porEstado = ESTADOS_RECOMENDACION.map((e) => [e, filas.filter((f) => f.estado_actual === e).length] as const).filter(
    ([, n]) => n > 0,
  );

  return (
    <details open={abierto} className="group">
      <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 p-4 hover:bg-muted/40 md:grid-cols-[auto_minmax(0,1fr)_16rem_15rem] [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">
          ▶
        </span>
        <div className="min-w-0">
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
        <div className="col-start-2 flex flex-col items-start gap-1.5 text-xs text-muted-foreground md:col-start-auto">
          <span>
            <span className="font-medium text-foreground">
              {filas.length} {filas.length === 1 ? "recomendación" : "recomendaciones"}
            </span>
            {porEstado.length > 0 ? ": " : ""}
            {porEstado.map(([e, n]) => `${n} ${n === 1 ? ESTADO_RECOMENDACION_LABELS[e].toLowerCase() : ESTADO_PLURAL[e]}`).join(" · ")}
          </span>
          {/* Un plazo vencido es un aviso sobre las mismas recomendaciones, no otra categoría: va
           * aparte y dice "con plazo vencido" para que no parezca que se suma al total. */}
          {vencidas > 0 ? (
            <span className="rounded-full border border-destructive/30 bg-destructive/5 px-2 py-0.5 font-medium text-destructive">
              {vencidas === 1 ? "1 con plazo vencido" : `${vencidas} con plazo vencido`}
            </span>
          ) : null}
        </div>
        {/* Los pasos del CAI (nombramiento, informe, SAG-UDAI) van como acción del grupo, no como
         * encabezado: lo que se sigue son las recomendaciones. */}
        {paso && paso !== "al_dia" ? (
          <div className="col-start-2 flex flex-col items-start gap-1 md:col-start-auto md:items-end md:text-right">
            <Button size="sm" nativeButton={false} render={<Link href={`/recomendaciones/cai/${informe.id}#siguiente-paso`} />}>
              {ACCION_PASO[paso]}
            </Button>
            <span className="text-xs text-muted-foreground">{PASO_CAI_FALTA[paso]}</span>
          </div>
        ) : null}
      </summary>
      <FilasRecomendacion filas={filas} contexto={contexto} />
    </details>
  );
}

export function FilasRecomendacion({
  filas,
  contexto: contextoGeneral,
  mostrarCai,
}: {
  filas: FilaRecomendacion[];
  contexto: Contexto;
  /** En el desglose plano cada fila lleva su CAI y dependencia (en los grupos por CAI ya están en el encabezado). */
  mostrarCai?: boolean;
}) {
  const hoy = hoyGuatemala();

  return (
    <ul className="divide-y border-t bg-muted/20">
      {filas.map((f) => {
        const contexto = contextoGeneral === "auto" ? f.bucket : contextoGeneral;
        return (
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
              {mostrarCai ? (
                <p className="text-xs text-muted-foreground">
                  <span className="codigo-expediente font-medium text-foreground">{etiquetaCai(f.informe.cai) ?? f.informe.no_nombramiento}</span>{" "}
                  · {f.informe.dependencia_auditada}
                </p>
              ) : null}
              <p className="text-sm font-medium">
                Def. {f.deficiencia.numero} · {f.deficiencia.titulo}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{f.texto}</p>
            </div>
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground md:text-right">
              <span className="font-medium text-foreground">{ETAPA_LABELS[f.etapa]}</span>
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
        );
      })}
    </ul>
  );
}
