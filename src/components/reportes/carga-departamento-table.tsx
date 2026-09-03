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

// Sección 7 "mapa de calor de carga por departamento": cada columna es su propia escala
// secuencial (0 → el máximo de esa columna), no una escala compartida entre columnas — mezclar
// escalas haría que la columna con números naturalmente más grandes (p. ej. documentos
// pendientes) siempre se viera "más caliente" que las demás sin que eso refleje carga real.
function pasoDeIntensidad(valor: number, max: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (valor <= 0 || max <= 0) return 0;
  return Math.min(5, Math.max(1, Math.ceil((valor / max) * 5))) as 1 | 2 | 3 | 4 | 5;
}

function CeldaCalor({ valor, max }: { valor: number; max: number }) {
  const paso = pasoDeIntensidad(valor, max);
  return (
    <TableCell>
      <span
        className="inline-flex min-w-10 justify-center rounded-md px-2 py-1 text-sm font-medium tabular-nums"
        style={
          paso === 0
            ? undefined
            : { backgroundColor: `var(--heat-${paso})`, color: `var(--heat-text-${paso})` }
        }
      >
        {valor}
      </span>
    </TableCell>
  );
}

export function CargaDepartamentoTable({ filas }: { filas: FilaCargaDepartamento[] }) {
  const maxActividades = Math.max(0, ...filas.map((f) => f.actividadesActivas));
  const maxDocumentos = Math.max(0, ...filas.map((f) => f.documentosPendientes));
  const maxOficios = Math.max(0, ...filas.map((f) => f.oficiosPendientes));

  return (
    <div className="rounded-lg border">
      <div className="border-b p-4">
        <h2 className="font-medium">Mapa de calor: carga de trabajo por departamento</h2>
        <p className="text-xs text-muted-foreground">
          Suma de los tres cargos dentro de cada departamento. Cada columna se colorea contra su
          propio máximo — vista rápida de dónde hay más volumen antes de bajar al detalle por
          integrante.
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
                <CeldaCalor valor={f.actividadesActivas} max={maxActividades} />
                <CeldaCalor valor={f.documentosPendientes} max={maxDocumentos} />
                <CeldaCalor valor={f.oficiosPendientes} max={maxOficios} />
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
