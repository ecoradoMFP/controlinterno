import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { ActividadForm } from "@/components/actividades/actividad-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NuevaActividadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; fieldErrors?: string }>;
}) {
  const { error, fieldErrors: fieldErrorsRaw } = await searchParams;
  const fieldErrors = fieldErrorsRaw ? (JSON.parse(fieldErrorsRaw) as Record<string, string>) : undefined;

  const usuario = await getUsuarioActual();

  if (!usuario || !puedeEscribir(usuario)) {
    redirect("/actividades");
  }

  const supabase = await createClient();

  // RLS ya limita `departamentos` a lectura abierta (es catálogo), así que aquí se acota la
  // UI al alcance real de creación: Jefe/Subjefe solo su propio departamento.
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
    supabase
      .from("usuarios")
      .select("*")
      .eq("activo", true)
      .order("nombre"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <ActividadForm
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
