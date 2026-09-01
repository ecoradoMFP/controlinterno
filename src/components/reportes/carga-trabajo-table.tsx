import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface FilaCargaTrabajo {
  nit: string;
  nombre: string;
  departamentoNombre: string | null;
  actividadesActivas: number;
  documentosPendientes: number;
  oficiosPendientes: number;
}

export function CargaTrabajoTable({ filas }: { filas: FilaCargaTrabajo[] }) {
  return (
    <div className="rounded-lg border">
      <div className="border-b p-4">
        <h2 className="font-medium">Carga de trabajo por auditor</h2>
        <p className="text-xs text-muted-foreground">
          Actividades activas asignadas, documentos pendientes de su firma/revisión (fase no
          finalizada, en la etapa del Auditor) y oficios propios sin respuesta todavía.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Auditor</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Actividades activas</TableHead>
            <TableHead>Documentos pendientes</TableHead>
            <TableHead>Oficios pendientes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length > 0 ? (
            filas.map((f) => (
              <TableRow key={f.nit}>
                <TableCell className="font-medium">{f.nombre}</TableCell>
                <TableCell>{f.departamentoNombre ?? "—"}</TableCell>
                <TableCell>{f.actividadesActivas}</TableCell>
                <TableCell>{f.documentosPendientes}</TableCell>
                <TableCell>{f.oficiosPendientes}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                No hay auditores dentro de tu alcance todavía.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
