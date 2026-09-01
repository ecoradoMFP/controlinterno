import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AMBITO_SEMAFORO_LABELS } from "@/types/domain";
import { actualizarUmbral, agregarFeriado, eliminarFeriado } from "./actions";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const usuario = await getUsuarioActual();

  // Sección 8/12.4: esta página no es solo RLS — la ruta en sí es exclusiva de Dirección
  // (control_total), aunque un usuario de consulta pudiera adivinar la URL.
  if (!usuario || usuario.permiso_sistema !== "control_total") {
    redirect("/reportes");
  }

  const supabase = await createClient();
  const [{ data: parametros }, { data: feriados }] = await Promise.all([
    supabase.from("parametros_semaforo").select("*").order("ambito"),
    supabase.from("calendario_feriados").select("*").order("fecha"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Configuración del semáforo</h1>
        <p className="text-sm text-muted-foreground">
          Umbrales (sección 5) y calendario de feriados (sección 4.12) — exclusivo de Dirección.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="rounded-lg border">
        <div className="border-b p-4">
          <h2 className="font-medium">Umbrales por ámbito</h2>
          <p className="text-xs text-muted-foreground">
            % de plazo hábil restante. Deben cumplir verde &gt; amarillo &gt; naranja.
          </p>
        </div>
        <div className="flex flex-col divide-y">
          {(parametros ?? []).map((p) => (
            <form
              key={p.id}
              action={actualizarUmbral}
              className="grid grid-cols-2 items-end gap-3 p-4 sm:grid-cols-5"
            >
              <input type="hidden" name="id" value={p.id} />
              <div>
                <p className="text-sm font-medium">{AMBITO_SEMAFORO_LABELS[p.ambito]}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Verde ≥</Label>
                <Input
                  name="umbral_verde_pct"
                  type="number"
                  step="0.01"
                  defaultValue={p.umbral_verde_pct}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Amarillo ≥</Label>
                <Input
                  name="umbral_amarillo_pct"
                  type="number"
                  step="0.01"
                  defaultValue={p.umbral_amarillo_pct}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Naranja &gt;</Label>
                <Input
                  name="umbral_naranja_pct"
                  type="number"
                  step="0.01"
                  defaultValue={p.umbral_naranja_pct}
                  required
                />
              </div>
              <Button type="submit" variant="outline">
                Guardar
              </Button>
            </form>
          ))}
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-4">
          <h2 className="font-medium">Calendario de feriados</h2>
          <p className="text-xs text-muted-foreground">
            Excluidos del cálculo de días hábiles en todo el sistema.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {feriados && feriados.length > 0 ? (
              feriados.map((f) => (
                <TableRow key={f.fecha}>
                  <TableCell>{f.fecha}</TableCell>
                  <TableCell>{f.descripcion}</TableCell>
                  <TableCell>
                    <form action={eliminarFeriado}>
                      <input type="hidden" name="fecha" value={f.fecha} />
                      <Button type="submit" variant="ghost" size="sm">
                        Eliminar
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  No hay feriados registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <form action={agregarFeriado} className="flex flex-wrap items-end gap-3 border-t p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Fecha</Label>
            <Input name="fecha" type="date" required />
          </div>
          <div className="flex min-w-64 flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Descripción</Label>
            <Input name="descripcion" required />
          </div>
          <Button type="submit" variant="outline">
            Agregar feriado
          </Button>
        </form>
      </div>
    </div>
  );
}
