import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeOperarInforme } from "@/lib/auth";
import { etiquetaCai } from "@/lib/recomendaciones";
import { BackLink } from "@/components/nav/back-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipoInformePanel } from "@/components/recomendaciones/equipo-informe-panel";
import { DeficienciasPanel } from "@/components/recomendaciones/deficiencias-panel";

export default async function InformeDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string; soloPendientes?: string }>;
}) {
  const { id } = await params;
  const { tab = "deficiencias", error, soloPendientes } = await searchParams;

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  const { data: informe } = await supabase
    .from("informes_auditoria")
    .select(
      "*, departamentos(nombre), supervisor:usuarios!informes_auditoria_supervisor_nit_fkey(nombre), coordinador:usuarios!informes_auditoria_coordinador_nit_fkey(nombre)",
    )
    .eq("id", id)
    .maybeSingle();

  // RLS ya decide qué informe es visible (mismo criterio que actividades): sin fila, es un 404.
  if (!informe) notFound();

  const [{ data: equipo }, { data: deficiencias }, { data: candidatos }, { data: historial }] = await Promise.all([
    supabase.from("informes_auditoria_equipo").select("*, usuarios(nombre, cargo, puesto)").eq("informe_id", id),
    supabase
      .from("deficiencias")
      .select("*, recomendaciones(*, seguimientos_recomendacion(*))")
      .eq("informe_id", id)
      .order("numero"),
    supabase.from("usuarios").select("*").eq("activo", true).order("nombre"),
    supabase
      .from("recomendaciones_historial")
      .select("id, accion, motivo, created_at, datos_anteriores, datos_nuevos, usuarios(nombre)")
      .eq("informe_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const nitsEnEquipo = new Set((equipo ?? []).map((m) => m.usuario_nit));
  const candidatosEquipo = (candidatos ?? []).filter((u) => !nitsEnEquipo.has(u.nit));

  const deficienciasOrdenadas = (deficiencias ?? []).map((d) => ({
    ...d,
    recomendaciones: [...d.recomendaciones].sort((a, b) => a.numero - b.numero),
  }));

  const puedeEditar = await puedeOperarInforme(usuario, id, supabase);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <BackLink href="/recomendaciones" label="Volver a las recomendaciones" />
        <BackLink href={`/recomendaciones/cai/${id}`} label={`Volver al ${etiquetaCai(informe.cai) ?? "CAI"}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="codigo-expediente text-lg">{etiquetaCai(informe.cai) ?? informe.no_nombramiento}</CardTitle>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:gap-10">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Dependencia auditada</p>
              <p className="text-base">{informe.dependencia_auditada}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tipo de auditoría</p>
              <p className="text-base">{informe.tipo_auditoria ?? "—"}</p>
            </div>
          </div>
          {informe.actividad_id ? (
            <Link
              href={`/actividades/${informe.actividad_id}`}
              className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Ver la auditoría de origen
            </Link>
          ) : null}
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
          <Info label="Departamento" value={informe.departamentos?.nombre} />
          <Info label="No. de nombramiento" value={informe.no_nombramiento} />
          <Info label="Fecha de nombramiento" value={informe.fecha_nombramiento} />
          <Info label="Fecha del informe final" value={informe.fecha_informe_final} />
          <Info label="Fecha de notificación" value={informe.fecha_notificacion} />
          <Info
            label="Período auditado"
            value={
              informe.periodo_auditado_inicio
                ? `${informe.periodo_auditado_inicio} — ${informe.periodo_auditado_fin}`
                : null
            }
          />
          <Info label="Supervisor" value={informe.supervisor?.nombre} />
          <Info label="Coordinador" value={informe.coordinador?.nombre} />
          {/* En la matriz de DAF el riesgo es una oración completa, no una etiqueta corta. */}
          <Info label="Riesgo" value={informe.riesgo} className="col-span-full" />
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="deficiencias">Deficiencias y recomendaciones</TabsTrigger>
          <TabsTrigger value="equipo">Equipo auditor</TabsTrigger>
        </TabsList>
        <TabsContent value="deficiencias">
          <DeficienciasPanel
            informeId={id}
            deficiencias={deficienciasOrdenadas}
            soloPendientes={soloPendientes === "1"}
            puedeEditar={puedeEditar}
            historial={historial ?? []}
          />
        </TabsContent>
        <TabsContent value="equipo">
          <EquipoInformePanel informeId={id} equipo={equipo ?? []} candidatos={candidatosEquipo} puedeEditar={puedeEditar} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value ?? "—"}</p>
    </div>
  );
}
