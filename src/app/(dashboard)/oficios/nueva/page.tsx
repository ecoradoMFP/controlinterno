import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { OficioForm } from "@/components/oficios/oficio-form";
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

  // RLS (`actividades_select`) ya acota esto al alcance real de quien elabora el oficio.
  const { data: actividades } = await supabase
    .from("actividades")
    .select("id, no_nombramiento")
    .order("no_nombramiento");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo oficio</CardTitle>
        </CardHeader>
        <CardContent>
          <OficioForm
            actividades={actividades ?? []}
            responsable={usuario}
            error={error}
            fieldErrors={fieldErrors}
          />
        </CardContent>
      </Card>
    </div>
  );
}
