import { cn } from "@/lib/utils";

/** Barras horizontales de una sola medida. `resaltar` pinta solo la mayor en color. */
export function BarrasHorizontales({
  filas,
  resaltar = false,
  vacio,
}: {
  filas: { clave: string; etiqueta: string; valor: number; texto: string; detalle?: string }[];
  resaltar?: boolean;
  vacio: string;
}) {
  if (filas.length === 0) return <p className="text-sm text-muted-foreground">{vacio}</p>;
  const maximo = Math.max(...filas.map((f) => f.valor), 0) || 1;
  return (
    <ul className="flex flex-col gap-3">
      {filas.map((f, i) => {
        const destacada = !resaltar || i === 0;
        return (
          <li key={f.clave} className="flex flex-col gap-1" title={f.detalle ?? `${f.etiqueta}: ${f.texto}`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn("truncate", destacada ? "font-medium" : "text-muted-foreground")}>{f.etiqueta}</span>
              <span className="shrink-0 font-semibold tabular-nums">{f.texto}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", destacada ? "bg-[var(--ring)]" : "bg-muted-foreground/40")}
                style={{ width: `${Math.max((f.valor / maximo) * 100, 2)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Días planeados contra días reales por etapa. */
export function PlanContraReal({ filas }: { filas: { etapa: string; plan: number; real: number; n: number }[] }) {
  if (filas.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay etapas concluidas para comparar.</p>;
  }
  const maximo = Math.max(...filas.flatMap((f) => [f.plan, f.real]), 1);
  return (
    <ul className="flex flex-col gap-4">
      {filas.map((f) => {
        const diferencia = Math.round(f.real - f.plan);
        return (
          <li key={f.etapa} className="flex flex-col gap-1.5" title={`${f.etapa}: promedio de ${f.n} actividad(es) del cronograma`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{f.etapa}</span>
              <span
                className={cn(
                  "shrink-0 text-xs font-semibold",
                  diferencia > 0 ? "text-[var(--status-rojo)]" : "text-[var(--status-verde)]",
                )}
              >
                {diferencia > 0
                  ? `${dias(diferencia)} hábil${diferencia === 1 ? "" : "es"} más de lo planeado`
                  : diferencia < 0
                    ? `${dias(-diferencia)} antes de lo planeado`
                    : "Igual a lo planeado"}
              </span>
            </div>
            <Fila etiqueta="Planeado" valor={f.plan} maximo={maximo} clase="bg-muted-foreground/40" />
            <Fila etiqueta="Real" valor={f.real} maximo={maximo} clase="bg-[var(--ring)]" />
          </li>
        );
      })}
    </ul>
  );
}

function Fila({ etiqueta, valor, maximo, clase }: { etiqueta: string; valor: number; maximo: number; clase: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-2 text-xs">
      <span className="text-muted-foreground">{etiqueta}</span>
      <div className="h-2 rounded-full bg-muted">
        <div className={cn("h-full rounded-full", clase)} style={{ width: `${Math.max((valor / maximo) * 100, 2)}%` }} />
      </div>
      <span className="text-right tabular-nums">{valor.toFixed(1)} días</span>
    </div>
  );
}

const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;
