import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SemaforoChip, type TonoSemaforo } from "@/components/semaforo-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calcularSemaforo, cumplidoATiempo, UMBRAL_POR_DEFECTO, COLOR_SEMAFORO_LABELS, type UmbralSemaforo } from "@/lib/semaforo";
import type { Oficio } from "@/types/domain";

/**
 * Estado de un oficio para la lista, usando el motor de semáforo real (sección 5) en vez de un
 * corte binario vencido/no-vencido: un oficio abierto que todavía tiene margen se ve distinto
 * de uno que ya está en rojo, igual que en /reportes.
 */
function estadoOficio(
  o: Pick<Oficio, "fecha_emision" | "fecha_respuesta" | "fecha_vencimiento">,
  hoy: string,
  feriados: ReadonlySet<string>,
  umbral: UmbralSemaforo,
): { tono: TonoSemaforo; label: string } {
  if (o.fecha_respuesta) {
    const aTiempo = !o.fecha_vencimiento || cumplidoATiempo(o.fecha_vencimiento, o.fecha_respuesta);
    return aTiempo
      ? { tono: "verde", label: "Respondido a tiempo" }
      : { tono: "amarillo", label: "Respondido tarde" };
  }
  if (!o.fecha_vencimiento) return { tono: "neutral", label: "Sin plazo" };
  const color = calcularSemaforo(o.fecha_emision, o.fecha_vencimiento, hoy, feriados, umbral);
  return { tono: color, label: COLOR_SEMAFORO_LABELS[color] };
}

export default async function OficiosPage() {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  // Sin filtro explícito: RLS (authz.puede_ver_oficio) ya devuelve el alcance correcto.
  const [{ data: oficios, error }, { data: parametros }, { data: feriadosRows }] = await Promise.all([
    supabase
      .from("oficios")
      .select(
        "id, no_oficio, destinatario, asunto, fecha_emision, fecha_vencimiento, fecha_respuesta, actividades(no_nombramiento)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("parametros_semaforo").select("*").eq("ambito", "oficio").maybeSingle(),
    supabase.from("calendario_feriados").select("fecha"),
  ]);

  const feriados = new Set((feriadosRows ?? []).map((f) => f.fecha));
  const umbral = (parametros as UmbralSemaforo | null) ?? UMBRAL_POR_DEFECTO;
  const hoy = new Date().toISOString().slice(0, 10);

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
                const estado = estadoOficio(o, hoy, feriados, umbral);
                return (
                  <TableRow key={o.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/oficios/${o.id}`} className="codigo-expediente hover:underline">
                        {o.no_oficio}
                      </Link>
                    </TableCell>
                    <TableCell>{o.actividades?.no_nombramiento ?? "—"}</TableCell>
                    <TableCell>{o.destinatario}</TableCell>
                    <TableCell className="max-w-xs truncate">{o.asunto}</TableCell>
                    <TableCell>{o.fecha_vencimiento ?? "—"}</TableCell>
                    <TableCell>
                      <SemaforoChip tono={estado.tono} label={estado.label} />
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
