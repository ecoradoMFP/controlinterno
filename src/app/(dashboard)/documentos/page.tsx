import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CARGO_LABELS, ETAPA_ACTIVIDAD_LABELS, FASE_DOCUMENTO_LABELS } from "@/types/domain";

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  // "mios" solo tiene sentido si el usuario tiene un cargo operativo; si no, mostramos todos.
  const { vista: vistaParam } = await searchParams;
  const soloMios = usuario?.cargo != null && vistaParam !== "todos";

  // Sin filtro de actividad: RLS (authz.puede_ver_actividad, vía documentos_actividad_select)
  // ya devuelve solo los documentos dentro del alcance del usuario actual.
  let query = supabase
    .from("documentos_actividad")
    .select(
      "id, fase_actual, cargo_actual_responsable, actividad_id, actividades(no_nombramiento, dependencia_auditada, etapa_actual), documentos_catalogo(nombre, etapa)",
    )
    .neq("fase_actual", "finalizado")
    .order("created_at");

  if (soloMios) {
    query = query.eq("cargo_actual_responsable", usuario!.cargo!);
  }

  const { data: documentos, error } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Documentos en curso (no finalizados) entre las actividades dentro de tu alcance.
          </p>
        </div>
        {usuario?.cargo ? (
          <div className="flex gap-2">
            <Button variant={soloMios ? "default" : "outline"} render={<Link href="/documentos" />}>
              Pendientes en mi cargo
            </Button>
            <Button variant={soloMios ? "outline" : "default"} render={<Link href="/documentos?vista=todos" />}>
              Todos en curso
            </Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">No se pudieron cargar los documentos.</p> : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actividad</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Fase actual</TableHead>
              <TableHead>Responsable actual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentos && documentos.length > 0 ? (
              documentos.map((d) => (
                <TableRow key={d.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/actividades/${d.actividad_id}?tab=documentos`}
                      className="font-medium hover:underline"
                    >
                      {d.actividades?.no_nombramiento ?? "—"}
                    </Link>
                    <p className="text-xs text-muted-foreground">{d.actividades?.dependencia_auditada}</p>
                  </TableCell>
                  <TableCell>{d.documentos_catalogo?.nombre ?? "—"}</TableCell>
                  <TableCell>
                    {d.documentos_catalogo ? ETAPA_ACTIVIDAD_LABELS[d.documentos_catalogo.etapa] : "—"}
                  </TableCell>
                  <TableCell>{FASE_DOCUMENTO_LABELS[d.fase_actual]}</TableCell>
                  <TableCell>{CARGO_LABELS[d.cargo_actual_responsable]}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  {soloMios
                    ? "No tienes documentos pendientes en tu cargo por ahora."
                    : "No hay documentos en curso dentro de tu alcance todavía."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
