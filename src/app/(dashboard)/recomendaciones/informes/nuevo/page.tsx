import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { InformeForm } from "@/components/recomendaciones/informe-form";
import { BackLink } from "@/components/nav/back-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NuevoInformePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; fieldErrors?: string }>;
}) {
  const { error, fieldErrors: fieldErrorsRaw } = await searchParams;
  const fieldErrors = fieldErrorsRaw ? (JSON.parse(fieldErrorsRaw) as Record<string, string>) : undefined;

  const usuario = await getUsuarioActual();

  if (!usuario || !puedeEscribir(usuario)) {
    redirect("/recomendaciones/informes");
  }

  const supabase = await createClient();

  // Mismo criterio que /actividades/nueva: Jefe/Subjefe solo pueden crear informes en su
  // propio departamento, así que la UI se acota al alcance real de creación.
  const departamentoFijo =
    usuario.cargo === "jefe" || usuario.cargo === "subjefe"
      ? await supabase
          .from("departamentos")
          .select("*")
          .eq("id", usuario.departamento_id ?? "")
          .maybeSingle()
          .then((r) => r.data ?? undefined)
      : undefined;

  const [{ data: departamentos }, { data: usuarios }] = await Promise.all([
    departamentoFijo ? Promise.resolve({ data: null }) : supabase.from("departamentos").select("*").order("nombre"),
    supabase.from("usuarios").select("*").eq("activo", true).order("nombre"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/recomendaciones/informes" label="Volver a Informes de auditoría" />

      <Card>
        <CardHeader>
          <CardTitle>Nuevo informe de auditoría</CardTitle>
        </CardHeader>
        <CardContent>
          <InformeForm
            departamentos={departamentos ?? []}
            usuarios={usuarios ?? []}
            departamentoFijo={departamentoFijo}
            error={error}
            fieldErrors={fieldErrors}
          />
        </CardContent>
      </Card>
    </div>
  );
}
