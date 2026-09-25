import Link from "next/link";
import { agregarDeficiencia, agregarRecomendacion } from "@/app/(dashboard)/recomendaciones/informes/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SemaforoChip } from "@/components/semaforo-chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ESTADO_RECOMENDACION_LABELS,
  ESTADO_RECOMENDACION_TONO,
  ESTADOS_RECOMENDACION,
  type Deficiencia,
  type Recomendacion,
  type SeguimientoRecomendacion,
} from "@/types/domain";

type RecomendacionConSeguimientos = Recomendacion & { seguimientos_recomendacion: SeguimientoRecomendacion[] };
type DeficienciaConRecomendaciones = Deficiencia & { recomendaciones: RecomendacionConSeguimientos[] };

const OPCIONES_ESTADO = Object.fromEntries(ESTADOS_RECOMENDACION.map((e) => [e, ESTADO_RECOMENDACION_LABELS[e]]));

export function DeficienciasPanel({
  informeId,
  deficiencias,
  soloPendientes,
  puedeEditar,
}: {
  informeId: string;
  deficiencias: DeficienciaConRecomendaciones[];
  soloPendientes: boolean;
  puedeEditar: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {soloPendientes
            ? "Mostrando solo recomendaciones abiertas (pendientes, en proceso o no cumplidas)."
            : "Mostrando todas las recomendaciones, incluidas las ya cumplidas."}
        </p>
        <Link
          href={`/recomendaciones/informes/${informeId}?${soloPendientes ? "" : "soloPendientes=1"}`}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {soloPendientes ? "Ver también las cumplidas" : "Ver solo abiertas"}
        </Link>
      </div>

      {deficiencias.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguna deficiencia capturada todavía.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {deficiencias.map((d) => {
            const recomendacionesVisibles = soloPendientes
              ? d.recomendaciones.filter((r) => r.estado_actual !== "cumplida")
              : d.recomendaciones;

            if (soloPendientes && recomendacionesVisibles.length === 0) return null;

            return (
              <div key={d.id} className="rounded-xl border p-4">
                <p className="font-medium">
                  {d.numero}. {d.titulo}
                </p>
                {d.descripcion ? <p className="mt-1 text-sm text-muted-foreground">{d.descripcion}</p> : null}

                <div className="mt-3 flex flex-col gap-3 border-t pt-3">
                  {recomendacionesVisibles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin recomendaciones capturadas todavía.</p>
                  ) : (
                    recomendacionesVisibles.map((r) => (
                      <RecomendacionItem key={r.id} recomendacion={r} />
                    ))
                  )}

                  {puedeEditar ? (
                    <form action={agregarRecomendacion} className="flex flex-col gap-3 rounded-md border border-dashed p-3">
                      <input type="hidden" name="informe_id" value={informeId} />
                      <input type="hidden" name="deficiencia_id" value={d.id} />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">Nueva recomendación</label>
                        <Textarea name="texto" rows={3} required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">
                          Responsables de implementarla (opcional)
                        </label>
                        <Textarea name="responsables" rows={2} placeholder="Nombre y puesto de cada responsable" />
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">Fecha de implementación (opcional)</label>
                          <Input name="fecha_implementacion" type="date" />
                        </div>
                        {/* 1ra etapa de la matriz de DAF: estado con el que sale la recomendación en
                         * el informe final; los seguimientos posteriores se registran en el desglose de la recomendación. */}
                        <div className="flex w-44 flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">Estado al informe final</label>
                          <Select name="estado_inicial" defaultValue="pendiente" items={OPCIONES_ESTADO}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ESTADOS_RECOMENDACION.map((e) => (
                                <SelectItem key={e} value={e}>
                                  {ESTADO_RECOMENDACION_LABELS[e]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" variant="outline" size="sm">
                          Agregar recomendación
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {puedeEditar ? (
        <form action={agregarDeficiencia} className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-4">
          <input type="hidden" name="informe_id" value={informeId} />
          <div className="flex min-w-56 flex-1 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Título de la nueva deficiencia</label>
            <Input name="titulo" required />
          </div>
          <div className="flex min-w-64 flex-[2] flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Descripción (opcional)</label>
            <Input name="descripcion" />
          </div>
          <Button type="submit" variant="outline">
            Agregar deficiencia
          </Button>
        </form>
      ) : null}
    </div>
  );
}

// En la captura del informe solo se resume el ciclo: el seguimiento completo (línea de tiempo y
// registro de nuevos seguimientos) vive en el desglose de cada recomendación.
function RecomendacionItem({ recomendacion }: { recomendacion: RecomendacionConSeguimientos }) {
  const seguimientos = recomendacion.seguimientos_recomendacion.filter((s) => s.numero_seguimiento > 0).length;

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm whitespace-pre-line">
            {recomendacion.numero}. {recomendacion.texto}
          </p>
          {recomendacion.responsables ? (
            <p className="text-xs whitespace-pre-line text-muted-foreground">
              Responsables de implementarla: {recomendacion.responsables}
            </p>
          ) : null}
          {recomendacion.fecha_implementacion ? (
            <p className="text-xs text-muted-foreground">Fecha de implementación: {recomendacion.fecha_implementacion}</p>
          ) : null}
        </div>
        <SemaforoChip
          tono={ESTADO_RECOMENDACION_TONO[recomendacion.estado_actual]}
          label={ESTADO_RECOMENDACION_LABELS[recomendacion.estado_actual]}
        />
      </div>
      <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
        <span>{seguimientos === 0 ? "Sin seguimientos todavía" : `${seguimientos} seguimiento(s)`}</span>
        <Link href={`/recomendaciones/${recomendacion.id}`} className="font-medium text-foreground underline-offset-2 hover:underline">
          Ver seguimiento de la recomendación →
        </Link>
      </div>
    </div>
  );
}
