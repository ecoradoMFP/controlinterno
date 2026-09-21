import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CARGO_LABELS, type CargoEnum } from "@/types/domain";

export interface FilaCargaTrabajo {
  nit: string;
  nombre: string;
  cargo: CargoEnum;
  departamentoNombre: string | null;
  actividadesActivas: number;
  documentosPendientes: number;
  oficiosPendientes: number;
}

export function CargaTrabajoTable({ filas }: { filas: FilaCargaTrabajo[] }) {
  return (
    <div className="rounded-xl border shadow-sm">
      <div className="border-b p-4">
        <h2 className="font-medium">Carga de trabajo por integrante</h2>
        <p className="text-xs text-muted-foreground">
          Desglose de todo el equipo (auditor, subjefe, jefe): actividades activas asignadas,
          documentos pendientes en la etapa de su cargo, y oficios propios sin respuesta todavía.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Integrante</TableHead>
            <TableHead>Cargo</TableHead>
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
                <TableCell>{CARGO_LABELS[f.cargo]}</TableCell>
                <TableCell>{f.departamentoNombre ?? "—"}</TableCell>
                <TableCell>{f.actividadesActivas}</TableCell>
                <TableCell>{f.documentosPendientes}</TableCell>
                <TableCell>{f.oficiosPendientes}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                No hay integrantes dentro de tu alcance todavía.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
