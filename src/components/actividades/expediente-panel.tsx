import Link from "next/link";
import {
  actualizarNombramiento,
  crearInformeRecomendaciones,
  registrarCierreExpediente,
} from "@/app/(dashboard)/actividades/[id]/actions";
import { RutaExpediente } from "@/components/actividades/ruta-expediente";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Actividad } from "@/types/domain";

type DatosExpediente = Pick<
  Actividad,
  | "id"
  | "etapa_actual"
  | "area"
  | "fecha_emision_nombramiento"
  | "fecha_notificacion_equipo"
  | "fecha_notificacion_dependencia"
  | "fecha_notificacion_informe"
  | "fecha_notificacion_cgc"
  | "fecha_entrega_archivo"
  | "observaciones"
  | "ruta_expediente"
  | "concluida"
>;

/**
 * Datos del Registro Auxiliar de Nombramientos y cierre del expediente. La auditoría concluye
 * con la entrega del expediente al archivo (confirmado por la DAI, 2026-10-01).
 */
export function ExpedientePanel({
  actividad,
  rutaCompleta,
  informeId,
  fechaProyectoJefatura,
  fechaProyectoDireccion,
  puedeGestionar,
  puedeCorregirCierre,
}: {
  actividad: DatosExpediente;
  rutaCompleta: string | null;
  informeId: string | null;
  /** Primera entrega del Informe de Auditoría al Jefe, sacada de la bitácora. */
  fechaProyectoJefatura: string | null;
  /** Primera entrega del Informe de Auditoría al Director, sacada de la bitácora. */
  fechaProyectoDireccion: string | null;
  puedeGestionar: boolean;
  puedeCorregirCierre: boolean;
}) {
  const enCierre = actividad.etapa_actual === "expediente_cierre";
  const puedeInforme = actividad.etapa_actual === "comunicacion_resultados" || enCierre;
  const cierreBloqueado = (fecha: string | null) => !!fecha && !puedeCorregirCierre;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <h3 className="font-medium">Nombramiento</h3>
        <form action={actualizarNombramiento} className="flex flex-col gap-4">
          <input type="hidden" name="actividad_id" value={actividad.id} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo label="Emisión del nombramiento" name="fecha_emision_nombramiento" valor={actividad.fecha_emision_nombramiento} disabled={!puedeGestionar} />
            <Campo label="Notificación al equipo" name="fecha_notificacion_equipo" valor={actividad.fecha_notificacion_equipo} disabled={!puedeGestionar} />
            <Campo label="Notificación a la dependencia" name="fecha_notificacion_dependencia" valor={actividad.fecha_notificacion_dependencia} disabled={!puedeGestionar} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="area">Área</Label>
            <Input id="area" name="area" defaultValue={actividad.area ?? ""} disabled={!puedeGestionar} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ruta_expediente">Carpeta del expediente digital</Label>
            <Input
              id="ruta_expediente"
              name="ruta_expediente"
              defaultValue={actividad.ruta_expediente ?? ""}
              placeholder="Auditorias/2026/DAF/NAI-001-2026"
              disabled={!puedeGestionar}
            />
            <RutaExpediente ruta={rutaCompleta} etiqueta="Ruta completa" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="observaciones_nombramiento">Observaciones</Label>
            <Textarea id="observaciones_nombramiento" name="observaciones" defaultValue={actividad.observaciones ?? ""} rows={2} disabled={!puedeGestionar} />
          </div>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <Dato label="Proyecto de informe presentado a jefatura" valor={fechaProyectoJefatura} ayuda="De la bitácora del Informe de Auditoría" />
            <Dato label="Proyecto de informe presentado a Dirección" valor={fechaProyectoDireccion} ayuda="De la bitácora del Informe de Auditoría" />
          </div>
          {puedeGestionar ? (
            <Button type="submit" variant="outline" className="w-fit">
              Guardar nombramiento
            </Button>
          ) : null}
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Cierre del expediente</h3>
          {actividad.concluida ? <Badge>Concluida</Badge> : <Badge variant="secondary">En curso</Badge>}
        </div>
        {!enCierre ? (
          <p className="text-sm text-muted-foreground">
            Las fechas de cierre se registran cuando la auditoría llega a Expediente / Cierre.
          </p>
        ) : (
          <form action={registrarCierreExpediente} className="flex flex-col gap-4">
            <input type="hidden" name="actividad_id" value={actividad.id} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Campo
                label="Notificación del informe"
                name="fecha_notificacion_informe"
                valor={actividad.fecha_notificacion_informe}
                disabled={!puedeGestionar || cierreBloqueado(actividad.fecha_notificacion_informe)}
              />
              <Campo
                label="Notificación a la CGC"
                name="fecha_notificacion_cgc"
                valor={actividad.fecha_notificacion_cgc}
                disabled={!puedeGestionar || cierreBloqueado(actividad.fecha_notificacion_cgc)}
              />
              <Campo
                label="Entrega al archivo"
                name="fecha_entrega_archivo"
                valor={actividad.fecha_entrega_archivo}
                disabled={!puedeGestionar || cierreBloqueado(actividad.fecha_entrega_archivo)}
              />
            </div>
            {/* Los campos deshabilitados no se envían: se reenvían ocultos para no borrarlos. */}
            {cierreBloqueado(actividad.fecha_notificacion_informe) ? (
              <input type="hidden" name="fecha_notificacion_informe" value={actividad.fecha_notificacion_informe ?? ""} />
            ) : null}
            {cierreBloqueado(actividad.fecha_notificacion_cgc) ? (
              <input type="hidden" name="fecha_notificacion_cgc" value={actividad.fecha_notificacion_cgc ?? ""} />
            ) : null}
            {cierreBloqueado(actividad.fecha_entrega_archivo) ? (
              <input type="hidden" name="fecha_entrega_archivo" value={actividad.fecha_entrega_archivo ?? ""} />
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="observaciones_cierre">
                Observaciones{puedeCorregirCierre ? " (obligatorio cambiarlas si corriges una fecha ya registrada)" : ""}
              </Label>
              <Textarea id="observaciones_cierre" name="observaciones" defaultValue={actividad.observaciones ?? ""} rows={2} disabled={!puedeGestionar} />
            </div>
            <p className="text-xs text-muted-foreground">
              Con la entrega al archivo la auditoría queda concluida. Una vez registradas, las fechas solo las corrige
              Dirección (control total) dejando constancia en observaciones.
            </p>
            {puedeGestionar && !(actividad.concluida && !puedeCorregirCierre) ? (
              <Button type="submit" className="w-fit">
                Registrar cierre
              </Button>
            ) : null}
          </form>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <h3 className="font-medium">Inventario de recomendaciones</h3>
        {informeId ? (
          <p className="text-sm">
            El informe de esta auditoría ya está en el inventario.{" "}
            <Link href={`/recomendaciones/informes/${informeId}`} className="underline underline-offset-2">
              Ver deficiencias y recomendaciones
            </Link>
          </p>
        ) : puedeInforme ? (
          <form action={crearInformeRecomendaciones} className="flex flex-col gap-2">
            <input type="hidden" name="actividad_id" value={actividad.id} />
            <p className="text-sm text-muted-foreground">
              Crea el informe en Recomendaciones con el nombramiento, la dependencia, el período y el equipo de esta
              auditoría; solo faltará capturar las deficiencias y recomendaciones.
            </p>
            {puedeGestionar ? (
              <Button type="submit" variant="outline" className="w-fit">
                Registrar informe en Recomendaciones
              </Button>
            ) : null}
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            El informe se pasa al inventario a partir de Comunicación de Resultados.
          </p>
        )}
      </section>
    </div>
  );
}

function Campo({ label, name, valor, disabled }: { label: string; name: string; valor: string | null; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="date" defaultValue={valor ?? ""} disabled={disabled} />
    </div>
  );
}

function Dato({ label, valor, ayuda }: { label: string; valor: string | null; ayuda: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{valor ?? "—"}</p>
      <p className="text-xs text-muted-foreground">{ayuda}</p>
    </div>
  );
}
