import Link from "next/link";
import {
  agregarDeficiencia,
  agregarRecomendacion,
  editarRecomendacion,
  eliminarRecomendacion,
} from "@/app/(dashboard)/recomendaciones/informes/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SemaforoChip } from "@/components/semaforo-chip";
import {
  ESTADO_RECOMENDACION_LABELS,
  ESTADO_RECOMENDACION_TONO,
  type Deficiencia,
  type Recomendacion,
  type SeguimientoRecomendacion,
} from "@/types/domain";

type RecomendacionConSeguimientos = Recomendacion & { seguimientos_recomendacion: SeguimientoRecomendacion[] };
export type CambioRecomendacion = {
  id: string
  accion: string
  motivo: string
  created_at: string
  datos_anteriores: unknown
  datos_nuevos: unknown
  usuarios: { nombre: string } | null
};
type DeficienciaConRecomendaciones = Deficiencia & { recomendaciones: RecomendacionConSeguimientos[] };

export function DeficienciasPanel({
  informeId,
  deficiencias,
  soloPendientes,
  puedeEditar,
  historial,
}: {
  informeId: string;
  historial: CambioRecomendacion[];
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
                      <RecomendacionItem key={r.id} recomendacion={r} informeId={informeId} puedeEditar={puedeEditar} />
                    ))
                  )}

                  {puedeEditar && d.recomendaciones.length === 0 ? (
                    <form action={agregarRecomendacion} className="flex flex-col gap-3 rounded-md border border-dashed p-3">
                      <input type="hidden" name="informe_id" value={informeId} />
                      <input type="hidden" name="deficiencia_id" value={d.id} />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">Recomendación de esta deficiencia (queda en estado Pendiente)</label>
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
                          <label className="text-xs text-muted-foreground">Fecha de implementación</label>
                          <Input name="fecha_implementacion" type="date" required />
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

      <HistorialCambios historial={historial} />

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
function RecomendacionItem({
  recomendacion,
  informeId,
  puedeEditar,
}: {
  recomendacion: RecomendacionConSeguimientos;
  informeId: string;
  puedeEditar: boolean;
}) {
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
      {puedeEditar ? (
        seguimientos > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Ya tiene seguimientos evaluados: su texto no se puede corregir ni eliminar.
          </p>
        ) : (
          <details className="mt-2 rounded-md border bg-background p-3">
            <summary className="cursor-pointer text-sm font-medium">Corregir o eliminar esta recomendación</summary>
            <div className="mt-3 flex flex-col gap-4">
              <form action={editarRecomendacion} className="flex flex-col gap-3">
                <input type="hidden" name="informe_id" value={informeId} />
                <input type="hidden" name="recomendacion_id" value={recomendacion.id} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Texto de la recomendación</label>
                  <Textarea name="texto" rows={3} required defaultValue={recomendacion.texto} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Responsables de implementarla</label>
                  <Textarea name="responsables" rows={2} defaultValue={recomendacion.responsables ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Fecha de implementación</label>
                  <Input name="fecha_implementacion" type="date" required className="w-44" defaultValue={recomendacion.fecha_implementacion ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">¿Por qué se corrige? (obligatorio, queda en el historial)</label>
                  <Input name="motivo" required minLength={5} placeholder="Ej.: error de digitación al copiar el texto" />
                </div>
                <Button type="submit" size="sm" className="w-fit">
                  Guardar corrección
                </Button>
              </form>

              <form action={eliminarRecomendacion} className="flex flex-col gap-3 border-t pt-3">
                <input type="hidden" name="informe_id" value={informeId} />
                <input type="hidden" name="recomendacion_id" value={recomendacion.id} />
                <p className="text-xs text-muted-foreground">
                  Eliminarla la quita de las listas y de la cédula, pero el sistema conserva en el historial quién la
                  eliminó, cuándo, por qué y cómo estaba.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">¿Por qué se elimina? (obligatorio)</label>
                  <Input name="motivo" required minLength={5} placeholder="Ej.: recomendación capturada dos veces" />
                </div>
                <Button type="submit" size="sm" variant="destructive" className="w-fit">
                  Eliminar recomendación
                </Button>
              </form>
            </div>
          </details>
        )
      ) : null}
      <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
        <span>{seguimientos === 0 ? "Sin seguimientos todavía" : `${seguimientos} seguimiento(s)`}</span>
        <Link href={`/recomendaciones/${recomendacion.id}`} className="font-medium text-foreground underline-offset-2 hover:underline">
          Ver seguimiento de la recomendación →
        </Link>
      </div>
    </div>
  );
}

const CAMPOS_CAMBIO: [string, string][] = [
  ["texto", "Texto"],
  ["responsables", "Responsables"],
  ["fecha_implementacion", "Fecha de implementación"],
];

// Bitácora de correcciones y eliminaciones: la escribe la base de datos, no se puede alterar.
function HistorialCambios({ historial }: { historial: CambioRecomendacion[] }) {
  if (historial.length === 0) return null;
  return (
    <details className="rounded-xl border p-4">
      <summary className="cursor-pointer text-sm font-medium">
        Historial de correcciones y eliminaciones ({historial.length})
      </summary>
      <ul className="mt-3 flex flex-col gap-3 text-sm">
        {historial.map((c) => {
          const antes = c.datos_anteriores as Record<string, string | number | null>;
          const despues = c.datos_nuevos as Record<string, string | number | null> | null;
          return (
            <li key={c.id} className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleString("es-GT", { timeZone: "America/Guatemala" })} · {c.usuarios?.nombre ?? "—"}
              </p>
              <p className="font-medium">
                {c.accion === "anulada" ? "Eliminó" : "Corrigió"} la recomendación {antes.numero}
              </p>
              <p className="text-xs">Motivo: {c.motivo}</p>
              {c.accion === "anulada" ? (
                <p className="mt-1 text-xs whitespace-pre-line text-muted-foreground">Decía: {antes.texto}</p>
              ) : (
                CAMPOS_CAMBIO.filter(([k]) => (antes[k] ?? null) !== (despues?.[k] ?? null)).map(([k, etiqueta]) => (
                  <p key={k} className="mt-1 text-xs whitespace-pre-line text-muted-foreground">
                    {etiqueta}: <span className="line-through">{antes[k] ?? "(vacío)"}</span> → {despues?.[k] ?? "(vacío)"}
                  </p>
                ))
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
