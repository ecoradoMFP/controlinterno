import { identificadorAuditoria } from "@/lib/auditoria";
import { hoyGuatemala } from "@/lib/recomendaciones";
import { FileText, ListChecks, Printer } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  esJefaturaAuditoria,
  getUsuarioActual,
  puedeCerrarEtapaActividad,
  puedeCorregirHechoConsumado,
  puedeEscribir,
} from "@/lib/auth";
import { rutaCompletaExpediente } from "@/lib/expediente-digital";
import { BackLink } from "@/components/nav/back-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipoPanel } from "@/components/actividades/equipo-panel";
import { CronogramaPanel } from "@/components/actividades/cronograma-panel";
import { DocumentosPanel } from "@/components/actividades/documentos-panel";
import { ExpedientePanel } from "@/components/actividades/expediente-panel";
import { EditarDatosAuditoria } from "@/components/actividades/editar-datos-auditoria";
import { BitacoraPanel } from "@/components/actividades/bitacora-panel";
import { SiguientePaso, type PendienteDocumento, type PendienteHito } from "@/components/actividades/siguiente-paso";
import { PasosCiclo, type PasoCiclo } from "@/components/recomendaciones/pasos-ciclo";
import {
  ETAPA_ACTIVIDAD_LABELS,
  SIGUIENTE_ETAPA,
  type CargoEnum,
  type EtapaActividadEnum,
  type Movimiento,
} from "@/types/domain";
import { calcularSemaforo, UMBRAL_POR_DEFECTO, type UmbralSemaforo } from "@/lib/semaforo";

const ORDEN_ETAPAS: EtapaActividadEnum[] = ["planificacion", "ejecucion", "comunicacion_resultados", "expediente_cierre"];

export default async function ActividadDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const { id } = await params;
  const { tab = "documentos", error } = await searchParams;

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  // `usuarios` hint explícito: sin él, PostgREST no puede elegir entre el FK directo
  // (auditor_principal_nit) y el camino many-to-many vía actividades_equipo, y falla con
  // PGRST201 ("more than one relationship was found").
  const { data: actividad } = await supabase
    .from("actividades")
    .select(
      "*, departamentos(nombre), auditor_principal:usuarios!actividades_auditor_principal_nit_fkey(nombre, puesto)",
    )
    .eq("id", id)
    .maybeSingle();

  // RLS ya decide qué actividad es visible (sección 8): si no vino nada, o no existe, o está
  // fuera del alcance del usuario actual — cualquiera de los dos casos es un 404 legítimo.
  if (!actividad) notFound();

  const [
    { data: equipo },
    { data: documentos },
    { data: catalogoTodos },
    { data: candidatos },
    { data: hitos },
    { data: parametrosHito },
    { data: feriadosRows },
    { data: matrizRevision },
    { data: etapaHistorial },
    { data: informeVinculado },
    { data: correccionesEquipo },
    { data: correccionesPlazos },
    { data: cambiosAuditoria },
  ] = await Promise.all([
    supabase
      .from("actividades_equipo")
      .select("*, usuarios(nombre, cargo, puesto)")
      .eq("actividad_id", id),
    supabase
      .from("documentos_actividad")
      .select(
        "*, documentos_catalogo(nombre, etapa, orden, genera_documento), movimientos(*, registrado_por:usuarios(nombre))",
      )
      .eq("actividad_id", id)
      .order("created_at"),
    supabase.from("documentos_catalogo").select("*").order("etapa").order("orden"),
    supabase.from("usuarios").select("*").eq("activo", true).order("nombre"),
    supabase
      .from("hitos_cronograma")
      .select("*, documentos_catalogo(nombre)")
      .eq("actividad_id", id)
      .order("codigo_jerarquico"),
    supabase.from("parametros_semaforo").select("*").eq("ambito", "hito").maybeSingle(),
    supabase.from("calendario_feriados").select("fecha"),
    supabase
      .from("documentos_catalogo_revision")
      .select("documento_catalogo_id, cargo")
      .eq("departamento_id", actividad.departamento_id)
      .order("orden_revision"),
    supabase
      .from("actividades_etapa_historial")
      .select("*, cerrado_por:usuarios(nombre)")
      .eq("actividad_id", id)
      .order("timestamp"),
    supabase.from("informes_auditoria").select("id").eq("actividad_id", id).maybeSingle(),
    supabase
      .from("actividades_equipo_correcciones")
      .select("*, registrado_por:usuarios!actividades_equipo_correcciones_registrado_por_nit_fkey(nombre)")
      .eq("actividad_id", id)
      .order("created_at"),
    supabase
      .from("hitos_cronograma_correcciones")
      .select("*, registrado_por:usuarios!hitos_cronograma_correcciones_registrado_por_nit_fkey(nombre)")
      .eq("actividad_id", id)
      .order("created_at"),
    supabase
      .from("actividades_cambios")
      .select("*, registrado_por:usuarios!actividades_cambios_registrado_por_nit_fkey(nombre)")
      .eq("actividad_id", id)
      .order("created_at"),
  ]);

  // Orden del catálogo (1-18): los documentos de una etapa se crean juntos al abrirla.
  const documentosSeguros = [...(documentos ?? [])].sort(
    (a, b) => (a.documentos_catalogo?.orden ?? 0) - (b.documentos_catalogo?.orden ?? 0),
  );
  const idsUsados = new Set(documentosSeguros.map((d) => d.documento_catalogo_id));
  // No se puede iniciar un documento de una etapa que la actividad todavía no alcanzó (mismo
  // orden fijo que refuerza la base de datos vía RLS) — el dropdown de "iniciar documento"
  // solo ofrece los que sí corresponden a la etapa actual.
  const catalogoDisponible = (catalogoTodos ?? []).filter(
    (c) => !idsUsados.has(c.id) && c.etapa === actividad.etapa_actual,
  );

  // Matriz de revisión del departamento (`documentos_catalogo_revision`, importada completa):
  // define el flujo guiado de cada documento. La que decide de verdad es la función SQL
  // `avanzar_documento`; aquí solo se usa para rotular los botones.
  const ordenRevisionPorDocumento = new Map<string, CargoEnum[]>();
  for (const fila of matrizRevision ?? []) {
    const lista = ordenRevisionPorDocumento.get(fila.documento_catalogo_id) ?? [];
    lista.push(fila.cargo);
    ordenRevisionPorDocumento.set(fila.documento_catalogo_id, lista);
  }

  const nitsEnEquipo = new Set((equipo ?? []).map((m) => m.usuario_nit));
  const candidatosEquipo = (candidatos ?? []).filter((u) => !nitsEnEquipo.has(u.nit));

  const movimientos = documentosSeguros
    .flatMap((d) =>
      (d.movimientos as unknown as (Movimiento & { registrado_por: { nombre: string } | null })[]).map((m) => ({
        ...m,
        documentos_actividad: { documentos_catalogo: d.documentos_catalogo },
      })),
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const puedeEditar = puedeEscribir(usuario) && !actividad.concluida;

  // Fechas del Registro Auxiliar de Nombramientos que salen de la bitácora del Informe de
  // Auditoría (último documento del catálogo): primera entrega a Jefe y a Director.
  const informe = documentosSeguros.find((d) => d.documentos_catalogo?.orden === 18);
  const primeraEntregaA = (cargo: CargoEnum) => {
    const fechas = ((informe?.movimientos ?? []) as Movimiento[])
      .filter((m) => m.a_cargo === cargo && (m.tipo_evento === "entrega" || m.tipo_evento === "aprobacion"))
      .map((m) => m.timestamp)
      .sort();
    return fechas[0] ? new Date(fechas[0]).toLocaleDateString("es-GT") : null;
  };
  // No es lo mismo que `puedeEditar`: cerrar etapa exige además el alcance de cargo de la
  // política RLS `actividades_update` (jefe/subjefe/subdirector/director, nunca Auditor) — ver
  // `puedeCerrarEtapaActividad`.
  const puedeCerrarEtapa = await puedeCerrarEtapaActividad(usuario, id, supabase);
  const feriadosSet = new Set((feriadosRows ?? []).map((f) => f.fecha));
  const umbralHito: UmbralSemaforo = parametrosHito ?? UMBRAL_POR_DEFECTO;
  const hoy = hoyGuatemala();

  // Pendientes de la etapa en curso: mismas condiciones que valida el trigger
  // `validar_avance_etapa` en la base de datos (la validación real vive allá); aquí solo arman
  // la tarjeta "Siguiente paso".
  const etapa = actividad.etapa_actual;
  const etapaSiguiente = SIGUIENTE_ETAPA[etapa];
  const docsPendientes: PendienteDocumento[] = documentosSeguros
    .filter((d) => d.documentos_catalogo?.etapa === etapa && d.fase_actual !== "finalizado")
    .map((d) => ({
      id: d.id,
      nombre: d.documentos_catalogo?.nombre ?? "Documento",
      orden: d.documentos_catalogo?.orden ?? null,
      fase: d.fase_actual,
      responsable: d.cargo_actual_responsable,
    }));
  const hitosPendientes: PendienteHito[] = (hitos ?? [])
    .filter((h) => h.etapa === etapa && h.estado !== "concluido")
    .map((h) => ({
      id: h.id,
      codigo: h.codigo_jerarquico,
      nombre: h.nombre,
      fechaFin: h.fecha_fin_esperada,
      responsable: h.cargo_responsable,
      color: calcularSemaforo(h.fecha_inicio_esperada, h.fecha_fin_esperada, hoy, feriadosSet, umbralHito),
    }));
  const enPlanificacion = etapa === "planificacion";
  const equipoPendiente = enPlanificacion
    ? (equipo ?? []).filter((m) => !m.fecha_recibido || !m.fecha_declaracion_independencia)
    : [];
  const sinEquipo = enPlanificacion && (equipo ?? []).length === 0;

  // Barra de etapas: documentos terminados de cada una.
  const indiceEtapa = ORDEN_ETAPAS.indexOf(etapa);
  const pasos: PasoCiclo[] = ORDEN_ETAPAS.map((e, i) => {
    const docs = documentosSeguros.filter((d) => d.documentos_catalogo?.etapa === e);
    const hechos = docs.filter((d) => d.fase_actual === "finalizado").length;
    const estado: PasoCiclo["estado"] =
      actividad.concluida || i < indiceEtapa ? "hecho" : i === indiceEtapa ? "actual" : "pendiente";
    let detalle: string | null = null;
    if (e === "expediente_cierre") detalle = actividad.concluida ? "Entregado al archivo" : "Notificaciones y archivo";
    else if (docs.length > 0) detalle = `${hechos} de ${docs.length} documentos`;
    return { titulo: ETAPA_ACTIVIDAD_LABELS[e], detalle, estado };
  });

  const documentosConDetalle = documentosSeguros.map((d) => ({
    ...d,
    movimientos: d.movimientos as unknown as Movimiento[],
    ruta_completa: rutaCompletaExpediente(d.ruta_archivo),
  }));

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/actividades" label="Volver a Auditorías (CAI)" />

      <Card>
        <CardHeader className="gap-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="codigo-expediente text-xl">{identificadorAuditoria(actividad)}</CardTitle>
              <p className="text-lg">{actividad.dependencia_auditada}</p>
            </div>
            {actividad.concluida ? <Badge className="h-7 px-3 text-sm">Concluida</Badge> : null}
          </div>
          <div className="grid grid-cols-1 gap-x-10 gap-y-2 pt-2 sm:grid-cols-3">
            <Info label="Departamento" value={actividad.departamentos?.nombre} />
            <Info label="Auditor principal" value={actividad.auditor_principal?.nombre} />
            <Info label="Límite de notificación" value={actividad.fecha_notificacion} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href={`/actividades/${id}/ficha`} />}>
            <Printer /> Ficha para imprimir
          </Button>
          <Button variant="outline" render={<Link href={`/actividades/${id}/hoja-de-ruta`} />}>
            <FileText /> Hoja de ruta completa
          </Button>
          {informeVinculado ? (
            <Button variant="outline" render={<Link href={`/recomendaciones/cai/${informeVinculado.id}`} />}>
              <ListChecks /> Ver en Recomendaciones
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <PasosCiclo pasos={pasos} etiqueta="Avance de la auditoría" />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <SiguientePaso
        actividadId={id}
        etapa={etapa}
        concluida={actividad.concluida}
        cargoUsuario={usuario?.cargo ?? null}
        documentos={docsPendientes}
        hitos={hitosPendientes}
        equipoPendiente={equipoPendiente}
        sinEquipo={sinEquipo}
        sinCronograma={(hitos ?? []).length === 0}
        puedeEditar={puedeEditar}
        puedeCerrarEtapa={puedeCerrarEtapa}
        puedeCorregirFechasEquipo={puedeEditar && esJefaturaAuditoria(usuario)}
        etapaSiguiente={etapaSiguiente}
        informeId={informeVinculado?.id ?? null}
        cierre={actividad}
        puedeCorregirCierre={puedeCorregirHechoConsumado(usuario)}
      />

      {/* `key`: al llegar desde un enlace "Abrir" con otra pestaña, se vuelve a montar en esa. */}
      <Tabs key={tab} defaultValue={tab}>
        <TabsList className="max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto">
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="equipo">Equipo</TabsTrigger>
          <TabsTrigger value="expediente">Nombramiento y cierre</TabsTrigger>
          <TabsTrigger value="bitacora">Bitácora</TabsTrigger>
        </TabsList>
        <TabsContent value="documentos">
          <DocumentosPanel
            actividadId={id}
            documentos={documentosConDetalle}
            catalogoDisponible={catalogoDisponible}
            ordenRevisionPorDocumento={ordenRevisionPorDocumento}
            usuario={usuario}
            etapaActual={etapa}
            puedeEditar={puedeEditar}
          />
        </TabsContent>
        <TabsContent value="cronograma">
          <CronogramaPanel
            actividadId={id}
            hitos={hitos ?? []}
            catalogo={catalogoTodos ?? []}
            feriados={feriadosSet}
            umbral={umbralHito}
            hoy={hoy}
            puedeEditar={puedeEditar}
            puedeCorregir={puedeEditar && esJefaturaAuditoria(usuario)}
            correcciones={correccionesPlazos ?? []}
          />
        </TabsContent>
        <TabsContent value="equipo">
          <EquipoPanel
            actividadId={id}
            equipo={equipo ?? []}
            candidatos={candidatosEquipo}
            correcciones={correccionesEquipo ?? []}
            puedeEditar={puedeEditar}
            puedeCorregir={puedeEditar && esJefaturaAuditoria(usuario)}
          />
        </TabsContent>
        <TabsContent value="expediente" className="flex flex-col gap-6">
          <EditarDatosAuditoria
            actividad={actividad}
            auditores={(candidatos ?? [])
              .filter((u) => u.departamento_id === actividad.departamento_id || u.nit === actividad.auditor_principal_nit)
              .map((u) => ({ nit: u.nit, nombre: u.nombre }))}
            cambios={cambiosAuditoria ?? []}
            puedeCorregir={
              puedeEscribir(usuario) &&
              esJefaturaAuditoria(usuario) &&
              (!actividad.concluida || puedeCorregirHechoConsumado(usuario))
            }
          />
          <ExpedientePanel
              actividad={actividad}
              rutaCompleta={rutaCompletaExpediente(actividad.ruta_expediente)}
              informeId={informeVinculado?.id ?? null}
              fechaProyectoJefatura={primeraEntregaA("jefe")}
              fechaProyectoDireccion={primeraEntregaA("director")}
              puedeGestionar={puedeCerrarEtapa}
              puedeCorregirCierre={puedeCorregirHechoConsumado(usuario)}
            />
        </TabsContent>
        <TabsContent value="bitacora">
          <div className="flex flex-col gap-4">
            {etapaHistorial && etapaHistorial.length > 0 ? (
              <div className="rounded-xl border p-3 text-sm">
                <p className="mb-2 font-medium">Cierres de etapa</p>
                <ul className="flex flex-col gap-1">
                  {etapaHistorial.map((h) => (
                    <li key={h.id} className="text-muted-foreground">
                      {ETAPA_ACTIVIDAD_LABELS[h.etapa_cerrada]} → {ETAPA_ACTIVIDAD_LABELS[h.etapa_siguiente]}
                      {" · "}
                      {new Date(h.timestamp).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" })}
                      {" · cerrado por "}
                      {h.cerrado_por?.nombre ?? h.cerrado_por_nit}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <BitacoraPanel movimientos={movimientos} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={mono ? "codigo-expediente" : undefined}>{value ?? "—"}</p>
    </div>
  );
}
