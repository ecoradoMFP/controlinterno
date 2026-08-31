import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipoPanel } from "@/components/actividades/equipo-panel";
import { DocumentosPanel } from "@/components/actividades/documentos-panel";
import { BitacoraPanel } from "@/components/actividades/bitacora-panel";
import { ETAPA_ACTIVIDAD_LABELS, type Movimiento } from "@/types/domain";

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

  const [{ data: equipo }, { data: documentos }, { data: catalogoTodos }, { data: candidatos }] =
    await Promise.all([
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
    ]);

  const documentosSeguros = documentos ?? [];
  const idsUsados = new Set(documentosSeguros.map((d) => d.documento_catalogo_id));
  const catalogoDisponible = (catalogoTodos ?? []).filter((c) => !idsUsados.has(c.id));

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

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{actividad.no_nombramiento}</CardTitle>
              <p className="text-sm text-muted-foreground">{actividad.dependencia_auditada}</p>
            </div>
            <Badge variant="secondary">{ETAPA_ACTIVIDAD_LABELS[actividad.etapa_actual]}</Badge>
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
        <TabsContent value="documentos">
          <DocumentosPanel
            actividadId={id}
            documentos={documentosSeguros}
            catalogoDisponible={catalogoDisponible}
            puedeEditar={puedeEditar}
          />
        </TabsContent>
        <TabsContent value="bitacora">
          <BitacoraPanel movimientos={movimientos} />
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
