import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeOperarInforme } from "@/lib/auth";
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

  const [{ data: equipo }, { data: deficiencias }, { data: candidatos }] = await Promise.all([
    supabase.from("informes_auditoria_equipo").select("*, usuarios(nombre, cargo, puesto)").eq("informe_id", id),
    supabase
      .from("deficiencias")
      .select("*, recomendaciones(*, seguimientos_recomendacion(*))")
      .eq("informe_id", id)
      .order("numero"),
    supabase.from("usuarios").select("*").eq("activo", true).order("nombre"),
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
      <BackLink href="/recomendaciones" label="Volver a Seguimiento a recomendaciones" />

      <Card>
        <CardHeader>
          <CardTitle className="codigo-expediente text-lg">{informe.no_nombramiento}</CardTitle>
          <p className="text-sm text-muted-foreground">{informe.dependencia_auditada}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
          <Info label="Departamento" value={informe.departamentos?.nombre} />
          <Info label="CAI" value={informe.cai} />
          <Info label="Fecha de la auditoría" value={informe.fecha} />
          <Info label="Fecha para informe final" value={informe.fecha_informe_final} />
          <Info label="Período auditado" value={`${informe.periodo_auditado_inicio} — ${informe.periodo_auditado_fin}`} />
          <Info label="Supervisor" value={informe.supervisor?.nombre} />
          <Info label="Coordinador" value={informe.coordinador?.nombre} />
          <Info label="Riesgo" value={informe.riesgo} />
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
          />
        </TabsContent>
        <TabsContent value="equipo">
          <EquipoInformePanel informeId={id} equipo={equipo ?? []} candidatos={candidatosEquipo} puedeEditar={puedeEditar} />
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
