import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearHoras, type RankingCuelloBotella } from "@/lib/bi";

export function RankingTable({
  titulo,
  descripcion,
  filas,
  etiquetaClave,
  columnaClave,
}: {
  titulo: string;
  descripcion: string;
  filas: RankingCuelloBotella[];
  etiquetaClave: (clave: string) => string;
  columnaClave: string;
}) {
  return (
    <div className="rounded-lg border">
      <div className="border-b p-4">
        <h2 className="font-medium">{titulo}</h2>
        <p className="text-xs text-muted-foreground">{descripcion}</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columnaClave}</TableHead>
            <TableHead>Tiempo prom.</TableHead>
            <TableHead>Tramos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length > 0 ? (
            filas.map((f) => (
              <TableRow key={f.clave}>
                <TableCell className="whitespace-normal font-medium">{etiquetaClave(f.clave)}</TableCell>
                <TableCell>{formatearHoras(f.horasPromedio)}</TableCell>
                <TableCell className="text-muted-foreground">{f.n}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                Todavía no hay tramos históricos (documentos que ya cambiaron de manos) dentro de
                tu alcance.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
