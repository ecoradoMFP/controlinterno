import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeGestionarCapacitacionDe } from "@/lib/auth";
import { BackLink } from "@/components/nav/back-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SemaforoChip } from "@/components/semaforo-chip";
import { colorCumplimiento, pctCumplimiento, COLOR_CUMPLIMIENTO_LABELS, HORAS_OBJETIVO_ANUAL } from "@/lib/capacitacion";
import { CapacitacionForm } from "@/components/capacitaciones/capacitacion-form";
import { eliminarCapacitacion } from "./actions";
import { Button } from "@/components/ui/button";

export default async function CapacitacionDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anio?: string; error?: string; fieldErrors?: string }>;
}) {
  const { id: nit } = await params;
  const { anio: anioParam, error, fieldErrors: fieldErrorsRaw } = await searchParams;
  const anioActual = new Date().getUTCFullYear();
  const anio = anioParam ? Number(anioParam) : anioActual;
  const fieldErrors: Record<string, string> = fieldErrorsRaw ? JSON.parse(fieldErrorsRaw) : {};

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  const { data: persona } = await supabase
    .from("usuarios")
    .select("nit, nombre, departamento_id, departamentos(nombre)")
    .eq("nit", nit)
    .maybeSingle();

  if (!persona) notFound();

  const { data: capacitaciones } = await supabase
    .from("capacitaciones")
    .select("id, nombre, institucion, horas, fecha, anio")
    .eq("usuario_nit", nit)
    .order("fecha", { ascending: false });

  const puedeRegistrar = await puedeGestionarCapacitacionDe(usuario, persona, supabase);

  const horasDelAnio = (capacitaciones ?? []).filter((c) => c.anio === anio).reduce((acc, c) => acc + Number(c.horas), 0);
  const color = colorCumplimiento(horasDelAnio);
  const pct = pctCumplimiento(horasDelAnio);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/capacitaciones" label="Volver a Capacitaciones" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{persona.nombre}</h1>
          <p className="text-sm text-muted-foreground">{persona.departamentos?.nombre ?? "Sin departamento"}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-semibold">{horasDelAnio.toFixed(1)} h</p>
            <p className="text-xs text-muted-foreground">de {HORAS_OBJETIVO_ANUAL}h · {anio}</p>
          </div>
          <SemaforoChip tono={color} label={COLOR_CUMPLIMIENTO_LABELS[color]} />
        </div>
      </div>

      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--status-rojo)]/25">
        <div className="h-full bg-[var(--status-verde)]" style={{ width: `${pct}%` }} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {puedeRegistrar ? <CapacitacionForm personalId={persona.nit} fieldErrors={fieldErrors} /> : null}

      <div className="rounded-xl border shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-medium">Historial de capacitaciones</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Capacitación</TableHead>
              <TableHead>Institución</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Horas</TableHead>
              {puedeRegistrar ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {capacitaciones && capacitaciones.length > 0 ? (
              capacitaciones.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.nombre}</TableCell>
                  <TableCell>{c.institucion}</TableCell>
                  <TableCell>{c.fecha}</TableCell>
                  <TableCell>{Number(c.horas).toFixed(1)} h</TableCell>
                  {puedeRegistrar ? (
                    <TableCell>
                      <form action={eliminarCapacitacion}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="personal_id" value={persona.nit} />
                        <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          Eliminar
                        </Button>
                      </form>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={puedeRegistrar ? 5 : 4} className="text-center text-sm text-muted-foreground">
                  Sin capacitaciones registradas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
