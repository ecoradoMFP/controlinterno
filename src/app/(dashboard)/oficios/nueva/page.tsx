import { identificadorAuditoria } from "@/lib/auditoria";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { OficioForm } from "@/components/oficios/oficio-form";
import { BackLink } from "@/components/nav/back-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NuevoOficioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; fieldErrors?: string }>;
}) {
  const { error, fieldErrors: fieldErrorsRaw } = await searchParams;
  const fieldErrors = fieldErrorsRaw ? (JSON.parse(fieldErrorsRaw) as Record<string, string>) : undefined;

  const usuario = await getUsuarioActual();
  if (!usuario || !puedeEscribir(usuario)) {
    redirect("/oficios");
  }

  const supabase = await createClient();

  const [{ data: actividades }, { data: asuetos }, { data: unidades }] = await Promise.all([
    supabase.from("actividades").select("id, cai, anio_cai, no_nombramiento").order("created_at", { ascending: false }),
    supabase.from("calendario_feriados").select("fecha"),
    supabase.from("unidades_ministerio").select("id, nombre, padre_id, orden").eq("activo", true),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/oficios" label="Volver a Oficios" />

      <Card>
        <CardHeader>
          <CardTitle>Registrar nuevo oficio</CardTitle>
        </CardHeader>
        <CardContent>
          <OficioForm
            actividades={(actividades ?? []).map((a) => ({ id: a.id, etiqueta: identificadorAuditoria(a) }))}
            unidades={unidades ?? []}
            responsable={usuario}
            asuetos={(asuetos ?? []).map((a) => a.fecha)}
            error={error}
            fieldErrors={fieldErrors}
          />
        </CardContent>
      </Card>
    </div>
  );
}
