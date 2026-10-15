import { BotonAccion, FormAccion } from "@/components/form-accion";
import Link from "next/link";
import { cerrarEtapa } from "@/app/(dashboard)/actividades/[id]/actions";
import { ConfirmacionEquipo } from "@/components/actividades/equipo-panel";
import { FormCierreExpediente, type DatosCierre } from "@/components/actividades/expediente-panel";
import { SemaforoChip } from "@/components/semaforo-chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COLOR_SEMAFORO_LABELS, type ColorSemaforo } from "@/lib/semaforo";
import { cn } from "@/lib/utils";
import {
  CARGO_LABELS,
  ETAPA_ACTIVIDAD_LABELS,
  FASE_DOCUMENTO_LABELS,
  type ActividadEquipo,
  type CargoEnum,
  type EtapaActividadEnum,
  type FaseDocumentoEnum,
} from "@/types/domain";

export type PendienteDocumento = {
  id: string;
  nombre: string;
  orden: number | null;
  fase: FaseDocumentoEnum;
  responsable: CargoEnum;
};

export type PendienteHito = {
  id: string;
  codigo: string;
  nombre: string;
  fechaFin: string;
  responsable: CargoEnum;
  color: ColorSemaforo;
};

export type PendienteEquipo = ActividadEquipo & { usuarios: { nombre: string } | null };

/**
 * Lo único que hay que mirar al entrar a una auditoría: qué falta para terminar la etapa en la que
 * va y quién lo tiene. Cuando ya no falta nada, ofrece cerrar la etapa (o, en Expediente / Cierre,
 * registrar el cierre). Mismas reglas que el trigger `validar_avance_etapa`, que es el que decide.
 */
export function SiguientePaso({
  actividadId,
  etapa,
  concluida,
  cargoUsuario,
  documentos,
  hitos,
  equipoPendiente,
  sinEquipo,
  sinCronograma,
  puedeEditar,
  puedeCerrarEtapa,
  puedeCorregirFechasEquipo,
  etapaSiguiente,
  informeId,
  cierre,
  puedeCorregirCierre,
}: {
  actividadId: string;
  etapa: EtapaActividadEnum;
  concluida: boolean;
  cargoUsuario: CargoEnum | null;
  documentos: PendienteDocumento[];
  hitos: PendienteHito[];
  equipoPendiente: PendienteEquipo[];
  sinEquipo: boolean;
  /** Todavía no se registran los plazos SAG-UDAI (cronograma de actividades). */
  sinCronograma: boolean;
  puedeEditar: boolean;
  puedeCerrarEtapa: boolean;
  puedeCorregirFechasEquipo: boolean;
  etapaSiguiente: EtapaActividadEnum | null;
  informeId: string | null;
  cierre: DatosCierre;
  puedeCorregirCierre: boolean;
}) {
  // Las actividades del cronograma no bloquean: al cerrar la etapa se concluyen con esa fecha.
  const pendientes = documentos.length + equipoPendiente.length + (sinEquipo ? 1 : 0) + (sinCronograma ? 1 : 0);
  const etapaLabel = ETAPA_ACTIVIDAD_LABELS[etapa];

  let titulo: string;
  if (concluida) titulo = "Auditoría concluida";
  else if (pendientes > 0) titulo = `Terminar ${etapaLabel}`;
  else if (etapaSiguiente) titulo = `Cerrar ${etapaLabel} y pasar a ${ETAPA_ACTIVIDAD_LABELS[etapaSiguiente]}`;
  else titulo = "Registrar el cierre del expediente";

  // Solo se enumera lo que le toca a quien mira (y los hitos en riesgo); lo demás se resume por
  // cargo, porque el detalle completo ya está en las pestañas de abajo.
  const meToca = (cargo: CargoEnum) => puedeEditar && !!cargoUsuario && cargo === cargoUsuario;
  const misDocs = documentos.filter((d) => meToca(d.responsable));
  const otrosDocs = documentos.filter((d) => !meToca(d.responsable));
  const hitosAVer = hitos.filter((h) => meToca(h.responsable) || h.color === "naranja" || h.color === "rojo");
  const otrosHitos = hitos.length - hitosAVer.length;

  return (
    <Card id="siguiente-paso" className={cn("scroll-mt-4", !concluida && "border-primary/40")}>
      <CardHeader className="gap-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">{concluida ? "Estado" : "Siguiente paso"}</p>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 text-sm">
        {concluida ? (
          <p className="text-muted-foreground">
            El expediente se entregó al archivo el {cierre.fecha_entrega_archivo}. No queda nada pendiente.
          </p>
        ) : null}

        {!concluida && pendientes > 0 ? (
          <p>
            Pendiente para cerrar {etapaLabel}: {resumenPendientes(documentos.length, 0, equipoPendiente.length + (sinEquipo ? 1 : 0), sinCronograma)}.
          </p>
        ) : null}

        {!concluida && sinCronograma ? (
          <Grupo titulo="Cronograma de actividades">
            <Fila>
              <span>
                <span className="font-medium">Registrar los plazos del SAG-UDAI-WEB</span>
                <span className="block text-sm text-muted-foreground">
                  Ocho actividades con su fecha de inicio y de fin; se reportan a la Contraloría General de Cuentas.
                </span>
              </span>
              <Button render={<Link href={`/actividades/${actividadId}?tab=cronograma#cronograma`} />}>Registrar cronograma</Button>
            </Fila>
          </Grupo>
        ) : null}

        {!concluida && sinEquipo ? (
          <Grupo titulo="Equipo">
            <Fila>
              <span>Todavía no hay equipo asignado.</span>
              <Link href={`/actividades/${actividadId}?tab=equipo#equipo`} className="text-primary underline-offset-2 hover:underline">
                Asignar equipo
              </Link>
            </Fila>
          </Grupo>
        ) : null}

        {!concluida && equipoPendiente.length > 0 ? (
          <Grupo titulo="Recibido del nombramiento y Declaración de Independencia">
            {equipoPendiente.map((m) => (
              <Fila key={m.usuario_nit}>
                <span className="font-medium">{m.usuarios?.nombre ?? m.usuario_nit}</span>
                <ConfirmacionEquipo
                  actividadId={actividadId}
                  miembro={m}
                  puedeEditar={puedeEditar}
                  puedeCorregir={puedeCorregirFechasEquipo}
                />
              </Fila>
            ))}
          </Grupo>
        ) : null}

        {!concluida && misDocs.length > 0 ? (
          <Grupo titulo={`Documentos a su cargo (${misDocs.length})`}>
            {misDocs.map((d) => (
              <Fila key={d.id}>
                <span className="min-w-0">
                  <span className="font-medium">
                    {d.orden ? `${d.orden}. ` : ""}
                    {d.nombre}
                  </span>
                  <span className="block text-xs text-muted-foreground">{FASE_DOCUMENTO_LABELS[d.fase]}</span>
                </span>
                <Button render={<Link href={`/actividades/${actividadId}?tab=documentos#doc-${d.id}`} />}>
                  {d.fase === "revision" ? "Revisar documento" : "Ver documento"}
                </Button>
              </Fila>
            ))}
          </Grupo>
        ) : null}

        {!concluida && hitosAVer.length > 0 ? (
          <Grupo titulo={`Actividades del cronograma (${hitosAVer.length})`}>
            {hitosAVer.map((h) => (
              <Fila key={h.id}>
                <span className="min-w-0">
                  <span className="font-medium">
                    {h.codigo}. {h.nombre}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Vence el {h.fechaFin} · a cargo del {CARGO_LABELS[h.responsable]}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <SemaforoChip tono={h.color} label={COLOR_SEMAFORO_LABELS[h.color]} />
                  <Link
                    href={`/actividades/${actividadId}?tab=cronograma#hito-${h.id}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Ver en el cronograma
                  </Link>
                </span>
              </Fila>
            ))}
          </Grupo>
        ) : null}

        {!concluida && hitos.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Las actividades del cronograma de {etapaLabel} que sigan abiertas se concluyen solas, con la fecha del
            cierre, al cerrar la etapa.
          </p>
        ) : null}

        {!concluida && (otrosDocs.length > 0 || otrosHitos > 0) ? (
          <p className="text-muted-foreground">
            {otrosDocs.length > 0 ? (
              <>
                {misDocs.length > 0 ? "Los demás documentos están" : "Los documentos pendientes están"}:{" "}
                <span className="text-foreground">{porCargo(otrosDocs)}</span>.{" "}
              </>
            ) : null}
            {otrosHitos > 0 ? `${otrosHitos === 1 ? "Otra actividad del cronograma va" : `Otras ${otrosHitos} actividades del cronograma van`} en tiempo. ` : null}
            Puede consultarlos abajo, en las pestañas{" "}
            <Link href={`/actividades/${actividadId}?tab=documentos#documentos`} className="text-primary underline-offset-2 hover:underline">
              Documentos
            </Link>{" "}
            y{" "}
            <Link href={`/actividades/${actividadId}?tab=cronograma#cronograma`} className="text-primary underline-offset-2 hover:underline">
              Cronograma
            </Link>
            .
          </p>
        ) : null}

        {!concluida && pendientes === 0 && etapaSiguiente ? (
          puedeCerrarEtapa ? (
            <>
              <p>Todos los pendientes de {etapaLabel} están terminados. Ya puede cerrar la etapa.</p>
              <FormAccion action={cerrarEtapa}>
                <input type="hidden" name="actividad_id" value={actividadId} />
                <BotonAccion size="lg">
                  Cerrar {etapaLabel} y pasar a {ETAPA_ACTIVIDAD_LABELS[etapaSiguiente]}
                </BotonAccion>
              </FormAccion>
            </>
          ) : (
            <p className="text-muted-foreground">
              Todos los pendientes de {etapaLabel} están terminados. Falta que la jefatura (Subjefe o Jefe) cierre la etapa.
            </p>
          )
        ) : null}

        {!concluida && pendientes === 0 && !etapaSiguiente ? (
          puedeCerrarEtapa ? (
            <FormCierreExpediente
              actividadId={actividadId}
              datos={cierre}
              puedeGestionar={puedeCerrarEtapa}
              puedeCorregirCierre={puedeCorregirCierre}
            />
          ) : (
            <p className="text-muted-foreground">
              Falta que la jefatura registre la notificación del informe, la notificación a la CGC y la entrega al
              archivo.
            </p>
          )
        ) : null}

        {!concluida && (etapa === "comunicacion_resultados" || etapa === "expediente_cierre") && !informeId ? (
          <p className="border-t pt-4 text-muted-foreground">
            Cuando cuente con el informe, regístrelo en Recomendaciones desde la pestaña{" "}
            <Link href={`/actividades/${actividadId}?tab=expediente#recomendaciones`} className="text-primary underline-offset-2 hover:underline">
              Nombramiento y cierre
            </Link>
            . Este paso no impide cerrar la etapa.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{titulo}</h3>
      <ul className="divide-y tarjeta">{children}</ul>
    </section>
  );
}

function Fila({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-3">{children}</li>
  );
}

function resumenPendientes(docs: number, hitos: number, equipo: number, sinCronograma: boolean) {
  const partes = [
    sinCronograma ? "registrar el cronograma" : null,
    docs ? `${docs} documento${docs === 1 ? "" : "s"}` : null,
    hitos ? `${hitos} actividad${hitos === 1 ? "" : "es"} del cronograma` : null,
    equipo ? `${equipo} pendiente${equipo === 1 ? "" : "s"} del equipo` : null,
  ].filter(Boolean);
  return partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
}

/** "8 con Auditor y 1 con Subjefe" */
function porCargo(docs: PendienteDocumento[]) {
  const cuenta = new Map<CargoEnum, number>();
  for (const d of docs) cuenta.set(d.responsable, (cuenta.get(d.responsable) ?? 0) + 1);
  const partes = [...cuenta].map(([cargo, n]) => `${n} con ${CARGO_LABELS[cargo]}`);
  return partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
}
