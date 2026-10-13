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
  | "no_nombramiento"
  | "tipo_auditoria"
  | "periodo_evaluado_inicio"
  | "periodo_evaluado_fin"
  | "fecha_inicio_plazo"
  | "expedientes_relacionados"
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

  // Concluida la auditoría, todo queda de consulta; solo Dirección (control total) puede corregir.
  const puedeEditarNombramiento = actividad.concluida ? puedeCorregirCierre : puedeGestionar;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-xl border p-4">
        <div>
          <h3 className="font-medium">Datos del nombramiento</h3>
          <p className="text-sm text-muted-foreground">
            Lo que se anota en el Registro Auxiliar de Nombramientos: el nombramiento de la auditoría, cuándo se
            emitió y cuándo se notificó al equipo y a la dependencia auditada.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Dato label="No. de nombramiento" valor={actividad.no_nombramiento} />
          <Dato label="Tipo de auditoría" valor={actividad.tipo_auditoria} />
          <Dato
            label="Período evaluado"
            valor={`Del ${fecha(actividad.periodo_evaluado_inicio)} al ${fecha(actividad.periodo_evaluado_fin)}`}
          />
          <Dato label="Inicio del plazo" valor={fecha(actividad.fecha_inicio_plazo)} />
          <Dato label="Emisión del nombramiento" valor={fecha(actividad.fecha_emision_nombramiento)} />
          <Dato label="Notificación al equipo" valor={fecha(actividad.fecha_notificacion_equipo)} />
          <Dato label="Notificación a la dependencia" valor={fecha(actividad.fecha_notificacion_dependencia)} />
          <Dato label="Área" valor={actividad.area} />
          {actividad.expedientes_relacionados.length > 0 ? (
            <Dato label="Expedientes relacionados" valor={actividad.expedientes_relacionados.join(", ")} />
          ) : null}
          <Dato label="Proyecto de informe entregado a la jefatura" valor={fechaProyectoJefatura} ayuda="Se toma de la bitácora del Informe de Auditoría" />
          <Dato label="Proyecto de informe entregado a Dirección" valor={fechaProyectoDireccion} ayuda="Se toma de la bitácora del Informe de Auditoría" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Carpeta del expediente digital (la asigna el sistema)</p>
          <RutaExpediente ruta={rutaCompleta} etiqueta="Ruta completa" />
        </div>
        {actividad.observaciones ? (
          <div>
            <p className="text-sm text-muted-foreground">Observaciones</p>
            <p className="whitespace-pre-line">{actividad.observaciones}</p>
          </div>
        ) : null}

        {puedeEditarNombramiento ? (
          <details className="rounded-lg border">
            <summary className="cursor-pointer p-3 font-medium text-primary">
              {actividad.concluida ? "Corregir datos del nombramiento (solo Dirección)" : "Editar datos del nombramiento"}
            </summary>
            <form action={actualizarNombramiento} className="flex flex-col gap-4 border-t p-4">
              <input type="hidden" name="actividad_id" value={actividad.id} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Campo label="Emisión del nombramiento" name="fecha_emision_nombramiento" valor={actividad.fecha_emision_nombramiento} />
                <Campo label="Notificación al equipo" name="fecha_notificacion_equipo" valor={actividad.fecha_notificacion_equipo} />
                <Campo label="Notificación a la dependencia" name="fecha_notificacion_dependencia" valor={actividad.fecha_notificacion_dependencia} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="area">Área</Label>
                <Input id="area" name="area" defaultValue={actividad.area ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="observaciones_nombramiento">Observaciones</Label>
                <Textarea id="observaciones_nombramiento" name="observaciones" defaultValue={actividad.observaciones ?? ""} rows={2} />
              </div>
              <Button type="submit" className="w-fit">
                Guardar cambios
              </Button>
            </form>
          </details>
        ) : null}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Cierre del expediente</h3>
          {actividad.concluida ? <Badge>Concluida</Badge> : <Badge variant="secondary">En curso</Badge>}
        </div>
        {!enCierre ? (
          <p className="text-sm text-muted-foreground">
            Las fechas de cierre se registran cuando la auditoría llega a Expediente / Cierre.
          </p>
        ) : !actividad.concluida ? (
          <p className="text-sm text-muted-foreground">
            Se registra en la tarjeta <span className="font-medium text-foreground">Siguiente paso</span>, arriba, cuando
            ya no quedan pendientes.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Dato label="Notificación del informe" valor={fecha(actividad.fecha_notificacion_informe)} />
              <Dato label="Notificación a la CGC" valor={fecha(actividad.fecha_notificacion_cgc)} />
              <Dato label="Entrega al archivo" valor={fecha(actividad.fecha_entrega_archivo)} />
            </div>
            <p className="text-sm text-muted-foreground">Con la entrega al archivo la auditoría quedó concluida.</p>
            {puedeCorregirCierre ? (
              <details className="rounded-lg border">
                <summary className="cursor-pointer p-3 font-medium text-primary">Corregir fechas de cierre (solo Dirección)</summary>
                <div className="border-t p-4">
                  <FormCierreExpediente
                    actividadId={actividad.id}
                    datos={actividad}
                    puedeGestionar={puedeGestionar}
                    puedeCorregirCierre={puedeCorregirCierre}
                  />
                </div>
              </details>
            ) : null}
          </>
        )}
      </section>

      <section id="recomendaciones" className="flex scroll-mt-4 flex-col gap-3 rounded-xl border p-4">
        <h3 className="font-medium">Inventario de recomendaciones</h3>
        {informeId ? (
          <p className="text-sm">
            El informe de esta auditoría ya está en el inventario.{" "}
            <Link href={`/recomendaciones/cai/${informeId}`} className="underline underline-offset-2">
              Ver el CAI en Recomendaciones
            </Link>
          </p>
        ) : puedeInforme ? (
          <form action={crearInformeRecomendaciones} className="flex flex-col gap-2">
            <input type="hidden" name="actividad_id" value={actividad.id} />
            <p className="text-sm text-muted-foreground">
              Cree el informe en Recomendaciones con el nombramiento, la dependencia, el período y el equipo de esta
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

export type DatosCierre = Pick<
  Actividad,
  "fecha_notificacion_informe" | "fecha_notificacion_cgc" | "fecha_entrega_archivo" | "observaciones" | "concluida"
>;

/** Notificación del informe, a la CGC y entrega al archivo: con la entrega la auditoría concluye. */
export function FormCierreExpediente({
  actividadId,
  datos,
  puedeGestionar,
  puedeCorregirCierre,
}: {
  actividadId: string;
  datos: DatosCierre;
  puedeGestionar: boolean;
  puedeCorregirCierre: boolean;
}) {
  const cierreBloqueado = (fecha: string | null) => !!fecha && !puedeCorregirCierre;
  return (
    <form action={registrarCierreExpediente} className="flex flex-col gap-4">
      <input type="hidden" name="actividad_id" value={actividadId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo
          label="Notificación del informe"
          name="fecha_notificacion_informe"
          valor={datos.fecha_notificacion_informe}
          disabled={!puedeGestionar || cierreBloqueado(datos.fecha_notificacion_informe)}
        />
        <Campo
          label="Notificación a la CGC"
          name="fecha_notificacion_cgc"
          valor={datos.fecha_notificacion_cgc}
          disabled={!puedeGestionar || cierreBloqueado(datos.fecha_notificacion_cgc)}
        />
        <Campo
          label="Entrega al archivo"
          name="fecha_entrega_archivo"
          valor={datos.fecha_entrega_archivo}
          disabled={!puedeGestionar || cierreBloqueado(datos.fecha_entrega_archivo)}
        />
      </div>
      {/* Los campos deshabilitados no se envían: se reenvían ocultos para no borrarlos. */}
      {cierreBloqueado(datos.fecha_notificacion_informe) ? (
        <input type="hidden" name="fecha_notificacion_informe" value={datos.fecha_notificacion_informe ?? ""} />
      ) : null}
      {cierreBloqueado(datos.fecha_notificacion_cgc) ? (
        <input type="hidden" name="fecha_notificacion_cgc" value={datos.fecha_notificacion_cgc ?? ""} />
      ) : null}
      {cierreBloqueado(datos.fecha_entrega_archivo) ? (
        <input type="hidden" name="fecha_entrega_archivo" value={datos.fecha_entrega_archivo ?? ""} />
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="observaciones_cierre">
          Observaciones{puedeCorregirCierre && datos.concluida ? " (indique el motivo si corrige una fecha ya registrada)" : ""}
        </Label>
        <Textarea id="observaciones_cierre" name="observaciones" defaultValue={datos.observaciones ?? ""} rows={2} disabled={!puedeGestionar} />
      </div>
      <p className="text-xs text-muted-foreground">
        Con la entrega al archivo la auditoría queda concluida. Una vez registradas, las fechas solo las corrige
        Dirección (control total) dejando constancia en observaciones.
      </p>
      {puedeGestionar && !(datos.concluida && !puedeCorregirCierre) ? (
        <Button type="submit" className="w-fit">
          Registrar cierre
        </Button>
      ) : null}
    </form>
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

function Dato({ label, valor, ayuda }: { label: string; valor: string | null; ayuda?: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{valor || "Sin registrar"}</p>
      {ayuda ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
    </div>
  );
}

/** "2026-03-26" → "26/03/2026" */
function fecha(iso: string | null) {
  return iso ? iso.split("-").reverse().join("/") : null;
}
