import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipoPanel } from "@/components/actividades/equipo-panel";
import { CronogramaPanel } from "@/components/actividades/cronograma-panel";
import { DocumentosPanel } from "@/components/actividades/documentos-panel";
import { BitacoraPanel } from "@/components/actividades/bitacora-panel";
import { cerrarEtapa } from "./actions";
import { ETAPA_ACTIVIDAD_LABELS, SIGUIENTE_ETAPA, type Movimiento } from "@/types/domain";
import { UMBRAL_POR_DEFECTO, type UmbralSemaforo } from "@/lib/semaforo";

export default async function ActividadDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const { id } = await params;
  const { tab = "equipo", error } = await searchParams;

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
  ] = await Promise.all([
    supabase
      .from("actividades_equipo")
      .select("*, usuarios(nombre, cargo, puesto)")
      .eq("actividad_id", id),
    supabase
      .from("documentos_actividad")
      .select("*, documentos_catalogo(nombre, etapa), movimientos(*, registrado_por:usuarios(nombre))")
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
  ]);

  const documentosSeguros = documentos ?? [];
  const idsUsados = new Set(documentosSeguros.map((d) => d.documento_catalogo_id));
  // No se puede iniciar un documento de una etapa que la actividad todavía no alcanzó (mismo
  // orden fijo que refuerza la base de datos vía RLS) — el dropdown de "iniciar documento"
  // solo ofrece los que sí corresponden a la etapa actual.
  const catalogoDisponible = (catalogoTodos ?? []).filter(
    (c) => !idsUsados.has(c.id) && c.etapa === actividad.etapa_actual,
  );

  // Sección 4.5: quién revisa cada documento varía por documento y departamento — la matriz
  // real (`documentos_catalogo_revision`) solo está sembrada para 2 de los 18 documentos hasta
  // ahora (ver nota en la migración de sección 4.5), así que esto es una sugerencia informativa
  // cuando hay dato, nunca una validación bloqueante.
  const ordenRevisionPorDocumento = new Map<string, string[]>();
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

  const puedeEditar = puedeEscribir(usuario);
  const feriadosSet = new Set((feriadosRows ?? []).map((f) => f.fecha));
  const umbralHito: UmbralSemaforo = parametrosHito ?? UMBRAL_POR_DEFECTO;
  const hoy = new Date().toISOString().slice(0, 10);

  // Mismas condiciones que valida el trigger `validar_avance_etapa` en la base de datos — se
  // recalculan aquí solo para mostrar un aviso antes de intentar cerrar, no como la validación
  // real (esa vive en la base, sección 12.1/12.3).
  const etapaSiguiente = SIGUIENTE_ETAPA[actividad.etapa_actual];
  const docsPendientesEtapa = documentosSeguros.filter(
    (d) => d.documentos_catalogo?.etapa === actividad.etapa_actual && d.fase_actual !== "finalizado",
  ).length;
  const hitosPendientesEtapa = (hitos ?? []).filter(
    (h) => h.etapa === actividad.etapa_actual && h.estado !== "concluido",
  ).length;
  const equipoIncompleto =
    actividad.etapa_actual === "planificacion"
      ? (equipo ?? []).filter((m) => !m.fecha_recibido || !m.fecha_declaracion_independencia).length
      : 0;
  const pendientesEtapa = docsPendientesEtapa + hitosPendientesEtapa + equipoIncompleto;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="codigo-expediente text-lg">{actividad.no_nombramiento}</CardTitle>
              <p className="text-sm text-muted-foreground">{actividad.dependencia_auditada}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary">{ETAPA_ACTIVIDAD_LABELS[actividad.etapa_actual]}</Badge>
              <Link
                href={`/actividades/${id}/hoja-de-ruta`}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Exportar hoja de ruta completa
              </Link>
              {puedeEditar && etapaSiguiente ? (
                <div className="flex flex-col items-end gap-1">
                  <form action={cerrarEtapa}>
                    <input type="hidden" name="actividad_id" value={id} />
                    <Button type="submit" variant="outline" size="sm">
                      Cerrar etapa → {ETAPA_ACTIVIDAD_LABELS[etapaSiguiente]}
                    </Button>
                  </form>
                  {pendientesEtapa > 0 ? (
                    <p className="max-w-56 text-right text-xs text-muted-foreground">
                      Faltan {docsPendientesEtapa > 0 ? `${docsPendientesEtapa} documento(s)` : null}
                      {docsPendientesEtapa > 0 && hitosPendientesEtapa > 0 ? ", " : null}
                      {hitosPendientesEtapa > 0 ? `${hitosPendientesEtapa} hito(s)` : null}
                      {(docsPendientesEtapa > 0 || hitosPendientesEtapa > 0) && equipoIncompleto > 0 ? " y " : null}
                      {equipoIncompleto > 0 ? `${equipoIncompleto} confirmación(es) de equipo` : null} por terminar en
                      esta etapa.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
          <Info label="Departamento" value={actividad.departamentos?.nombre} />
          <Info label="Auditor principal" value={actividad.auditor_principal?.nombre} />
          <Info label="Tipo de auditoría" value={actividad.tipo_auditoria} />
          <Info label="Notificación" value={actividad.fecha_notificacion} />
          <Info label="Período evaluado" value={`${actividad.periodo_evaluado_inicio} — ${actividad.periodo_evaluado_fin}`} />
          <Info label="Inicio de plazo" value={actividad.fecha_inicio_plazo} />
          <Info
            label="Expedientes relacionados"
            value={actividad.expedientes_relacionados.length > 0 ? actividad.expedientes_relacionados.join(", ") : "—"}
          />
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="equipo">Equipo</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="bitacora">Bitácora</TabsTrigger>
        </TabsList>
        <TabsContent value="equipo">
          <EquipoPanel
            actividadId={id}
            equipo={equipo ?? []}
            candidatos={candidatosEquipo}
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
          />
        </TabsContent>
        <TabsContent value="documentos">
          <DocumentosPanel
            actividadId={id}
            documentos={documentosSeguros}
            catalogoDisponible={catalogoDisponible}
            ordenRevisionPorDocumento={ordenRevisionPorDocumento}
            puedeEditar={puedeEditar}
          />
        </TabsContent>
        <TabsContent value="bitacora">
          <div className="flex flex-col gap-4">
            {etapaHistorial && etapaHistorial.length > 0 ? (
              <div className="rounded-lg border p-3 text-sm">
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

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value ?? "—"}</p>
    </div>
  );
}
