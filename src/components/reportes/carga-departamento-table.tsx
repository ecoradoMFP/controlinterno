import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface FilaCargaDepartamento {
  departamentoNombre: string;
  actividadesActivas: number;
  documentosPendientes: number;
  oficiosPendientes: number;
}

export function CargaDepartamentoTable({ filas }: { filas: FilaCargaDepartamento[] }) {
  return (
    <div className="rounded-lg border">
      <div className="border-b p-4">
        <h2 className="font-medium">Carga de trabajo por departamento</h2>
        <p className="text-xs text-muted-foreground">
          Suma de los tres cargos dentro de cada departamento — vista rápida de dónde hay más
          volumen antes de bajar al detalle por integrante.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Departamento</TableHead>
            <TableHead>Actividades activas</TableHead>
            <TableHead>Documentos pendientes</TableHead>
            <TableHead>Oficios pendientes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length > 0 ? (
            filas.map((f) => (
              <TableRow key={f.departamentoNombre}>
                <TableCell className="font-medium">{f.departamentoNombre}</TableCell>
                <TableCell>{f.actividadesActivas}</TableCell>
                <TableCell>{f.documentosPendientes}</TableCell>
                <TableCell>{f.oficiosPendientes}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                No hay datos dentro de tu alcance todavía.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
