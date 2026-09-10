import Link from "next/link";
import { agregarDeficiencia, agregarRecomendacion, registrarSeguimiento } from "@/app/(dashboard)/recomendaciones/[id]/actions";
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
  type Deficiencia,
  type EstadoRecomendacionEnum,
  type Recomendacion,
  type SeguimientoRecomendacion,
} from "@/types/domain";

type RecomendacionConSeguimientos = Recomendacion & { seguimientos_recomendacion: SeguimientoRecomendacion[] };
type DeficienciaConRecomendaciones = Deficiencia & { recomendaciones: RecomendacionConSeguimientos[] };

const ESTADOS: EstadoRecomendacionEnum[] = ["pendiente", "en_proceso", "atendida"];

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
            ? "Mostrando solo recomendaciones pendientes o en proceso."
            : "Mostrando todas las recomendaciones, incluidas las ya atendidas."}
        </p>
        <Link
          href={`/recomendaciones/${informeId}?${soloPendientes ? "" : "soloPendientes=1"}`}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {soloPendientes ? "Ver también las atendidas" : "Ver solo pendientes/en proceso"}
        </Link>
      </div>

      {deficiencias.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguna deficiencia capturada todavía.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {deficiencias.map((d) => {
            const recomendacionesVisibles = soloPendientes
              ? d.recomendaciones.filter((r) => r.estado_actual !== "atendida")
              : d.recomendaciones;

            if (soloPendientes && recomendacionesVisibles.length === 0) return null;

            return (
              <div key={d.id} className="rounded-lg border p-4">
                <p className="font-medium">
                  {d.numero}. {d.titulo}
                </p>
                {d.descripcion ? <p className="mt-1 text-sm text-muted-foreground">{d.descripcion}</p> : null}

                <div className="mt-3 flex flex-col gap-3 border-t pt-3">
                  {recomendacionesVisibles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin recomendaciones capturadas todavía.</p>
                  ) : (
                    recomendacionesVisibles.map((r) => (
                      <RecomendacionItem key={r.id} informeId={informeId} recomendacion={r} puedeEditar={puedeEditar} />
                    ))
                  )}

                  {puedeEditar ? (
                    <form action={agregarRecomendacion} className="flex flex-wrap items-end gap-3 rounded-md border border-dashed p-3">
                      <input type="hidden" name="informe_id" value={informeId} />
                      <input type="hidden" name="deficiencia_id" value={d.id} />
                      <div className="flex min-w-56 flex-1 flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">Nueva recomendación</label>
                        <Input name="texto" required />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">Fecha de implementación (opcional)</label>
                        <Input name="fecha_implementacion" type="date" />
                      </div>
                      <Button type="submit" variant="outline" size="sm">
                        Agregar recomendación
                      </Button>
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

function RecomendacionItem({
  informeId,
  recomendacion,
  puedeEditar,
}: {
  informeId: string;
  recomendacion: RecomendacionConSeguimientos;
  puedeEditar: boolean;
}) {
  const seguimientos = [...recomendacion.seguimientos_recomendacion].sort((a, b) => a.numero_seguimiento - b.numero_seguimiento);

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm">
            {recomendacion.numero}. {recomendacion.texto}
          </p>
          {recomendacion.fecha_implementacion ? (
            <p className="text-xs text-muted-foreground">Fecha de implementación: {recomendacion.fecha_implementacion}</p>
          ) : null}
        </div>
        <SemaforoChip
          tono={ESTADO_RECOMENDACION_TONO[recomendacion.estado_actual]}
          label={ESTADO_RECOMENDACION_LABELS[recomendacion.estado_actual]}
        />
      </div>

      {seguimientos.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1 border-t pt-2 text-xs text-muted-foreground">
          {seguimientos.map((s) => (
            <li key={s.id}>
              Seguimiento {s.numero_seguimiento} · {s.fecha} · Informe {s.no_informe_seguimiento} ·{" "}
              {ESTADO_RECOMENDACION_LABELS[s.estado]}
              {s.comentario ? ` · ${s.comentario}` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {puedeEditar && recomendacion.estado_actual !== "atendida" ? (
        <form action={registrarSeguimiento} className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
          <input type="hidden" name="informe_id" value={informeId} />
          <input type="hidden" name="recomendacion_id" value={recomendacion.id} />
          <div className="flex w-40 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">No. de informe</label>
            <Input name="no_informe_seguimiento" required className="h-8" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Fecha</label>
            <Input name="fecha" type="date" required className="h-8" />
          </div>
          <div className="flex w-40 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Estado</label>
            <Select name="estado" required items={Object.fromEntries(ESTADOS.map((e) => [e, ESTADO_RECOMENDACION_LABELS[e]]))}>
              <SelectTrigger className="h-8 w-full">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESTADO_RECOMENDACION_LABELS[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-40 flex-1 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Comentario (opcional)</label>
            <Textarea name="comentario" rows={1} className="h-8 min-h-8" />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Registrar seguimiento
          </Button>
        </form>
      ) : null}
    </div>
  );
}
