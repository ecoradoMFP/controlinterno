import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ETAPA_ACTIVIDAD_LABELS } from "@/types/domain";

export default async function ActividadesPage() {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  // Sin filtro explícito por departamento/cargo: RLS (authz.puede_ver_actividad) ya devuelve
  // exactamente el alcance correcto para quien esté autenticado (sección 8).
  const { data: actividades, error } = await supabase
    .from("actividades")
    .select("id, no_nombramiento, dependencia_auditada, tipo_auditoria, etapa_actual, fecha_notificacion, departamentos(nombre)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Actividades</h1>
        {puedeEscribir(usuario) ? (
          <Button render={<Link href="/actividades/nueva" />}>Nueva actividad</Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive">No se pudieron cargar las actividades.</p>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombramiento</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Dependencia auditada</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Notificación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actividades && actividades.length > 0 ? (
              actividades.map((a) => (
                <TableRow key={a.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/actividades/${a.id}`} className="codigo-expediente hover:underline">
                      {a.no_nombramiento}
                    </Link>
                  </TableCell>
                  <TableCell>{a.departamentos?.nombre ?? "—"}</TableCell>
                  <TableCell>{a.dependencia_auditada}</TableCell>
                  <TableCell>{a.tipo_auditoria}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ETAPA_ACTIVIDAD_LABELS[a.etapa_actual]}</Badge>
                  </TableCell>
                  <TableCell>{a.fecha_notificacion}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No hay actividades dentro de tu alcance todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
