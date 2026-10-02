import Link from "next/link";
import { registrarSeguimientoCai } from "@/app/(dashboard)/recomendaciones/actions";
import { SemaforoChip } from "@/components/semaforo-chip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { etiquetaCai } from "@/lib/recomendaciones";
import type { cargarCedulaDocumento } from "@/lib/recomendaciones-datos";
import { ESTADO_RECOMENDACION_LABELS, ESTADO_RECOMENDACION_TONO, type EstadoRecomendacionEnum } from "@/types/domain";

type FilaCedula = NonNullable<Awaited<ReturnType<typeof cargarCedulaDocumento>>>["filas"][number];

// Mismo orden de columnas que la cédula impresa: Cumplida / No cumplida / En proceso / Pendiente.
const OPCIONES_ESTADO: EstadoRecomendacionEnum[] = ["cumplida", "no_cumplida", "en_proceso", "pendiente"];

/**
 * Seguimiento agrupado por CAI: un panel por cada CAI que cubre el nombramiento, con el estado,
 * las acciones y el comentario de todas sus recomendaciones pendientes, que se guardan juntas con
 * un solo botón. Cada recomendación conserva su propio ciclo e historial.
 */
export function PanelSeguimientoCai({
  documentoId,
  filas,
  puedeRegistrar,
  volverA,
}: {
  documentoId: string;
  filas: FilaCedula[];
  puedeRegistrar: boolean;
  /** Ruta a la que regresa tras guardar (por defecto, la cédula del nombramiento). */
  volverA?: string;
}) {
  const grupos = new Map<string, FilaCedula[]>();
  for (const f of filas) {
    const lista = grupos.get(f.informe.id) ?? [];
    lista.push(f);
    grupos.set(f.informe.id, lista);
  }

  return (
    <div id="panel-seguimiento" className="flex flex-col gap-4">
      {[...grupos.values()].map((grupo) => {
        const { informe } = grupo[0];
        const porEvaluar = grupo.filter((f) => !f.evaluacion);
        const evaluadas = grupo.filter((f) => f.evaluacion);

        return (
          <section key={informe.id} className="flex flex-col gap-3 rounded-xl border p-4">
            <header>
              <h3 className="codigo-expediente text-base font-semibold">{etiquetaCai(informe.cai) ?? informe.no_nombramiento}</h3>
              <p className="text-sm text-muted-foreground">
                {informe.dependencia_auditada}
                {informe.tipo_auditoria ? ` · ${informe.tipo_auditoria}` : ""}
                {informe.no_nombramiento ? ` · Nombramiento ${informe.no_nombramiento}` : ""}
              </p>
            </header>

            {evaluadas.map((f) => (
              <Recomendacion key={f.recomendacion.id} fila={f}>
                <p className="text-sm">
                  <span className="font-medium">Resultado en este seguimiento:</span>{" "}
                  {ESTADO_RECOMENDACION_LABELS[f.evaluacion!.estado]} (seguimiento no. {f.evaluacion!.numero_seguimiento})
                </p>
                {f.evaluacion!.acciones_responsables ? (
                  <p className="text-sm whitespace-pre-line text-muted-foreground">
                    Acciones de los responsables: {f.evaluacion!.acciones_responsables}
                  </p>
                ) : null}
                {f.evaluacion!.comentario_auditoria ? (
                  <p className="text-sm whitespace-pre-line text-muted-foreground">
                    Comentario de auditoría: {f.evaluacion!.comentario_auditoria}
                  </p>
                ) : null}
              </Recomendacion>
            ))}

            {porEvaluar.length > 0 ? (
              puedeRegistrar ? (
                <form action={registrarSeguimientoCai} className="flex flex-col gap-4">
                  <input type="hidden" name="documento_id" value={documentoId} />
                  <input type="hidden" name="informe_id" value={informe.id} />
                  {volverA ? <input type="hidden" name="volver_a" value={volverA} /> : null}
                  {porEvaluar.map((f) => {
                    const rid = f.recomendacion.id;
                    return (
                      <Recomendacion key={rid} fila={f}>
                        <input type="hidden" name="recomendacion_id" value={rid} />
                        <fieldset className="flex flex-col gap-2">
                          <legend className="mb-1 text-sm font-medium">Nuevo estado</legend>
                          <div className="flex flex-wrap gap-2">
                            {OPCIONES_ESTADO.map((e) => (
                              <label
                                key={e}
                                className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary/5"
                              >
                                <input type="radio" name={`estado__${rid}`} value={e} required className="accent-primary" />
                                {ESTADO_RECOMENDACION_LABELS[e]}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium" htmlFor={`acciones__${rid}`}>
                              Acciones de los responsables
                            </label>
                            <Textarea id={`acciones__${rid}`} name={`acciones__${rid}`} rows={3} />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium" htmlFor={`comentario__${rid}`}>
                              Comentario de auditoría
                            </label>
                            <Textarea id={`comentario__${rid}`} name={`comentario__${rid}`} rows={3} />
                          </div>
                        </div>
                      </Recomendacion>
                    );
                  })}
                  <div className="flex flex-col gap-1">
                    <Button type="submit" size="lg" className="w-fit">
                      Registrar seguimiento de {etiquetaCai(informe.cai) ?? "este CAI"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Se guardan juntas las {porEvaluar.length} recomendaciones de este CAI. Una marcada como Cumplida cierra
                      su ciclo.
                    </p>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {porEvaluar.length} recomendación(es) por evaluar. Lo registra el auditor nombrado o la jefatura.
                </p>
              )
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function Recomendacion({ fila, children }: { fila: FilaCedula; children: React.ReactNode }) {
  const { deficiencia, recomendacion, anteriores } = fila;
  const ultimoAnterior = anteriores.at(-1);
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium">
          Def. {deficiencia.numero} · {deficiencia.titulo}
        </p>
        <SemaforoChip
          tono={ESTADO_RECOMENDACION_TONO[recomendacion.estado_actual]}
          label={ESTADO_RECOMENDACION_LABELS[recomendacion.estado_actual]}
        />
      </div>
      <p className="text-sm whitespace-pre-line">{recomendacion.texto}</p>
      {ultimoAnterior ? (
        <p className="text-xs text-muted-foreground">
          Seguimiento anterior: {ESTADO_RECOMENDACION_LABELS[ultimoAnterior.estado]}
          {ultimoAnterior.documentos_seguimiento?.no_documento ? ` (informe ${ultimoAnterior.documentos_seguimiento.no_documento})` : ""}
        </p>
      ) : null}
      {children}
      <Link
        href={`/recomendaciones/${recomendacion.id}`}
        className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Ver historial de la recomendación
      </Link>
    </div>
  );
}
