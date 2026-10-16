import Link from "next/link";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatearMinutos, MESES } from "@/lib/permisos";

export type FilaMatriz = { clave: string; etiqueta: string; href?: string; minutos: number[] };

export function MatrizMeses({ titulo, filas, etiquetaFila }: { titulo: string; filas: FilaMatriz[]; etiquetaFila: string }) {
  const totalMes = MESES.map((_, i) => filas.reduce((acc, f) => acc + f.minutos[i], 0));
  const total = totalMes.reduce((a, b) => a + b, 0);
  const celda = (m: number) => (m > 0 ? formatearMinutos(m) : <span className="text-muted-foreground/50">0:00</span>);

  return (
    <section className="tarjeta">
      <h3 className="border-b px-5 py-3 font-semibold">{titulo}</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-48">{etiquetaFila}</TableHead>
              {MESES.map((m) => (
                <TableHead key={m} className="text-right">
                  {m.slice(0, 3)}
                </TableHead>
              ))}
              <TableHead className="text-right font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center text-sm text-muted-foreground">
                  Sin registros.
                </TableCell>
              </TableRow>
            ) : (
              filas.map((f) => (
                <TableRow key={f.clave}>
                  <TableCell className="font-medium">
                    {f.href ? (
                      <Link href={f.href} className="hover:underline">
                        {f.etiqueta}
                      </Link>
                    ) : (
                      f.etiqueta
                    )}
                  </TableCell>
                  {f.minutos.map((m, i) => (
                    <TableCell key={i} className="text-right tabular-nums">
                      {celda(m)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatearMinutos(f.minutos.reduce((a, b) => a + b, 0))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {filas.length > 1 ? (
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                {totalMes.map((m, i) => (
                  <TableCell key={i} className="text-right font-semibold tabular-nums">
                    {formatearMinutos(m)}
                  </TableCell>
                ))}
                <TableCell className="text-right font-semibold tabular-nums">{formatearMinutos(total)}</TableCell>
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>
    </section>
  );
}
