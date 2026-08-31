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
import type { Oficio } from "@/types/domain";

/**
 * Estado simple para la lista (respondido / vencido / pendiente). No es el motor de semáforo
 * de la sección 5 (verde/amarillo/naranja/rojo, con días hábiles y `calendario_feriados`) —
 * eso llega con el módulo de reportes.
 */
function estadoOficio(o: Pick<Oficio, "fecha_respuesta" | "fecha_vencimiento">) {
  if (o.fecha_respuesta) return { label: "Respondido", variant: "secondary" as const };
  if (o.fecha_vencimiento && o.fecha_vencimiento < new Date().toISOString().slice(0, 10)) {
    return { label: "Vencido", variant: "destructive" as const };
  }
  return { label: "Pendiente", variant: "outline" as const };
}

export default async function OficiosPage() {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  // Sin filtro explícito: RLS (authz.puede_ver_oficio) ya devuelve el alcance correcto.
  const { data: oficios, error } = await supabase
    .from("oficios")
    .select("id, no_oficio, destinatario, asunto, fecha_vencimiento, fecha_respuesta, actividades(no_nombramiento)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Oficios</h1>
        {puedeEscribir(usuario) ? (
          <Button render={<Link href="/oficios/nueva" />}>Nuevo oficio</Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">No se pudieron cargar los oficios.</p> : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. de oficio</TableHead>
              <TableHead>Actividad</TableHead>
              <TableHead>Destinatario</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {oficios && oficios.length > 0 ? (
              oficios.map((o) => {
                const estado = estadoOficio(o);
                return (
                  <TableRow key={o.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/oficios/${o.id}`} className="font-medium hover:underline">
                        {o.no_oficio}
                      </Link>
                    </TableCell>
                    <TableCell>{o.actividades?.no_nombramiento ?? "—"}</TableCell>
                    <TableCell>{o.destinatario}</TableCell>
                    <TableCell className="max-w-xs truncate">{o.asunto}</TableCell>
                    <TableCell>{o.fecha_vencimiento ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={estado.variant}>{estado.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No hay oficios dentro de tu alcance todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
