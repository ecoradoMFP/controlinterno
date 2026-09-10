import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SemaforoChip } from "@/components/semaforo-chip";
import { colorCumplimiento, pctCumplimiento, COLOR_CUMPLIMIENTO_LABELS } from "@/lib/capacitacion";

export interface FilaPersonalCapacitacion {
  nit: string;
  nombre: string;
  departamento: string | null;
  horasAcumuladas: number;
}

export function PersonalCapacitacionTable({ filas }: { filas: FilaPersonalCapacitacion[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Horas acumuladas</TableHead>
            <TableHead>Avance</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length > 0 ? (
            filas.map((f) => {
              const color = colorCumplimiento(f.horasAcumuladas);
              const pct = pctCumplimiento(f.horasAcumuladas);
              return (
                <TableRow key={f.nit}>
                  <TableCell>
                    <Link href={`/capacitaciones/${encodeURIComponent(f.nit)}`} className="font-medium hover:underline">
                      {f.nombre}
                    </Link>
                  </TableCell>
                  <TableCell>{f.departamento ?? <span className="text-xs text-muted-foreground">Sin departamento</span>}</TableCell>
                  <TableCell>{f.horasAcumuladas.toFixed(1)} h</TableCell>
                  <TableCell>
                    <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-[var(--status-rojo)]/25">
                      <div className="h-full bg-[var(--status-verde)]" style={{ width: `${pct}%` }} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <SemaforoChip tono={color} label={COLOR_CUMPLIMIENTO_LABELS[color]} />
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                No hay personal dentro de tu alcance.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
