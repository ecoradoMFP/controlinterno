import { cn } from "@/lib/utils";
import { CARGO_LABELS, TIPO_EVENTO_LABELS, type CargoEnum, type Movimiento } from "@/types/domain";

type MovimientoConAutor = Movimiento & { registrado_por: { nombre: string } | null };

/**
 * Representación visual de la sección 6's proceso iterativo: cada documento no avanza en línea
 * recta por las fases, va y vuelve entre cargos (una devolución para corrección es literalmente
 * un paso hacia atrás en el flujo). El flujograma hace ese vaivén visible de un vistazo, algo que
 * la lista cronológica de abajo no transmite tan directo.
 */
export function FlujogramaDocumento({ movimientos }: { movimientos: MovimientoConAutor[] }) {
  if (movimientos.length === 0) return null;

  const primero = movimientos[0];
  const nodos: CargoEnum[] = [primero.de_cargo ?? primero.a_cargo, ...movimientos.map((m) => m.a_cargo)];

  return (
    <div className="flex flex-wrap items-center gap-y-2 rounded-md bg-muted/40 px-3 py-3">
      {nodos.map((cargo, i) => (
        <div key={i} className="flex items-center">
          <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium whitespace-nowrap">
            {CARGO_LABELS[cargo]}
          </span>
          {i < movimientos.length ? <FlechaEvento movimiento={movimientos[i]} /> : null}
        </div>
      ))}
    </div>
  );
}

function FlechaEvento({ movimiento }: { movimiento: MovimientoConAutor }) {
  // La devolución para corrección es el único tipo de evento que mueve el documento hacia atrás
  // en el proceso (vuelve a un cargo que ya lo tuvo) — se marca distinto para que salte a la
  // vista igual que en la lista cronológica.
  const esRetorno = movimiento.tipo_evento === "devolucion_correccion";
  return (
    <div className={cn("mx-1.5 flex flex-col items-center px-1", esRetorno ? "text-destructive" : "text-muted-foreground")}>
      <span className="text-[10px] leading-none font-medium whitespace-nowrap">
        {TIPO_EVENTO_LABELS[movimiento.tipo_evento]}
      </span>
      <span className="text-base leading-none">{esRetorno ? "↩" : "→"}</span>
    </div>
  );
}
