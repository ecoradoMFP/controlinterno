import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { departamentosParaNombrarSeguimiento, getUsuarioActual } from "@/lib/auth";
import { crearNombramientoSeguimiento } from "@/app/(dashboard)/recomendaciones/actions";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { etiquetaCai } from "@/lib/recomendaciones";
import { CARGO_LABELS, TIPO_DOCUMENTO_SEGUIMIENTO_LABELS } from "@/types/domain";

const SELECT_CLASES =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function NuevoNombramientoSeguimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ informe?: string; error?: string; fieldErrors?: string }>;
}) {
  const { informe: informePreseleccionado, error, fieldErrors: fieldErrorsRaw } = await searchParams;
  const fieldErrors = fieldErrorsRaw ? (JSON.parse(fieldErrorsRaw) as Record<string, string>) : {};

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  const gestionables = await departamentosParaNombrarSeguimiento(usuario, supabase);
  // Emitir nombramientos es función de jefatura (authz.puede_nombrar_seguimiento).
  if (gestionables.length === 0) redirect("/recomendaciones");

  const [{ data: departamentos }, { data: usuarios }, { data: informes }] = await Promise.all([
    supabase.from("departamentos").select("id, nombre").in("id", gestionables).order("nombre"),
    supabase.from("usuarios").select("nit, nombre, cargo, puesto, departamento_id").eq("activo", true).order("nombre"),
    // Solo informes con recomendaciones abiertas: son los que tiene sentido seguir.
    supabase
      .from("informes_auditoria")
      .select("id, no_nombramiento, cai, dependencia_auditada, departamento_id, deficiencias(recomendaciones(estado_actual))"),
  ]);

  const informesAbiertos = (informes ?? [])
    .map((i) => ({
      ...i,
      abiertas: i.deficiencias.flatMap((d) => d.recomendaciones).filter((r) => r.estado_actual !== "cumplida").length,
    }))
    .filter((i) => i.abiertas > 0 || i.id === informePreseleccionado)
    .sort((a, b) => a.dependencia_auditada.localeCompare(b.dependencia_auditada));

  const departamentoPorDefecto =
    informesAbiertos.find((i) => i.id === informePreseleccionado)?.departamento_id ??
    (usuario?.departamento_id && gestionables.includes(usuario.departamento_id) ? usuario.departamento_id : gestionables[0]);

  // Auditores del departamento que nombra primero; el resto después, por si se nombra a alguien
  // de otro departamento.
  const candidatos = [...(usuarios ?? [])].sort(
    (a, b) =>
      Number(b.departamento_id === departamentoPorDefecto) - Number(a.departamento_id === departamentoPorDefecto) ||
      a.nombre.localeCompare(b.nombre),
  );

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/recomendaciones" label="Volver a la bandeja de recomendaciones" />

      <Card>
        <CardHeader>
          <CardTitle>Emitir nombramiento de seguimiento</CardTitle>
          <p className="text-sm text-muted-foreground">
            Nombra a los auditores que darán seguimiento y los CAI que cubre. Ellos podrán registrar el resultado de cada
            recomendación; el número del informe se registra cuando se emita.
          </p>
        </CardHeader>
        <CardContent>
          <form action={crearNombramientoSeguimiento} className="flex max-w-3xl flex-col gap-6">
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Departamento que nombra" htmlFor="departamento_id">
                <select id="departamento_id" name="departamento_id" defaultValue={departamentoPorDefecto} className={SELECT_CLASES}>
                  {(departamentos ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Tipo de documento que resultará" htmlFor="tipo_documento">
                <select id="tipo_documento" name="tipo_documento" defaultValue="informe" className={SELECT_CLASES}>
                  <option value="informe">{TIPO_DOCUMENTO_SEGUIMIENTO_LABELS.informe} (lo normal)</option>
                  <option value="oficio">{TIPO_DOCUMENTO_SEGUIMIENTO_LABELS.oficio} (plazo corto, mismo año)</option>
                </select>
              </Campo>
              <Campo label="No. de nombramiento" htmlFor="no_nombramiento" error={fieldErrors.no_nombramiento}>
                <Input id="no_nombramiento" name="no_nombramiento" placeholder="DAI-DAF-SR-CAI-06-2026" />
              </Campo>
              <Campo label="Fecha del nombramiento" htmlFor="fecha_nombramiento" error={fieldErrors.fecha_nombramiento}>
                <Input id="fecha_nombramiento" name="fecha_nombramiento" type="date" />
              </Campo>
            </div>

            <p className="-mt-3 text-xs text-muted-foreground">
              Un oficio no lleva nombramiento: deja esos campos en blanco. El número del informe u oficio se registra
              cuando se emita, después de evaluar las recomendaciones.
            </p>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Auditor(es) nombrado(s)</legend>
              {fieldErrors.auditores ? <p className="text-xs text-destructive">{fieldErrors.auditores}</p> : null}
              <div className="grid max-h-72 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
                {candidatos.map((u) => (
                  <label key={u.nit} className="flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm hover:bg-muted/50 has-checked:bg-primary/5">
                    <input type="checkbox" name="auditores" value={u.nit} className="mt-0.5 accent-primary" />
                    <span>
                      {u.nombre}
                      <span className="block text-xs text-muted-foreground">
                        {u.puesto ?? (u.cargo ? CARGO_LABELS[u.cargo] : "Sin cargo")}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">CAI / informes que cubre</legend>
              {fieldErrors.informes ? <p className="text-xs text-destructive">{fieldErrors.informes}</p> : null}
              {informesAbiertos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay informes con recomendaciones abiertas.</p>
              ) : (
                <div className="grid max-h-72 gap-1 overflow-y-auto rounded-lg border p-2">
                  {informesAbiertos.map((i) => (
                    <label key={i.id} className="flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm hover:bg-muted/50 has-checked:bg-primary/5">
                      <input
                        type="checkbox"
                        name="informes"
                        value={i.id}
                        defaultChecked={i.id === informePreseleccionado}
                        className="mt-0.5 accent-primary"
                      />
                      <span>
                        <span className="codigo-expediente font-medium">
                          {[etiquetaCai(i.cai), i.no_nombramiento].filter(Boolean).join(" · ")}
                        </span>{" "}
                        · {i.dependencia_auditada}
                        <span className="block text-xs text-muted-foreground">{i.abiertas} recomendación(es) abierta(s)</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <Button type="submit" className="w-fit">
              Emitir nombramiento
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Campo({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
