import { COLOR_SEMAFORO_CSS_VAR } from "@/components/semaforo-chip";
import { COLOR_SEMAFORO_LABELS, type ColorSemaforo } from "@/lib/semaforo";
import { cn } from "@/lib/utils";

// Gráficas del tablero de Reportes en HTML simple: barras con su etiqueta y su valor escritos al
// lado (nunca solo color), y `title` como tooltip. Sin librería: son pocas barras y así se leen
// igual en claro, oscuro e impresión.

const ORDEN_SEMAFORO: ColorSemaforo[] = ["verde", "amarillo", "naranja", "rojo"];

/** Parte de un todo: cuántas auditorías hay en cada color, en una sola barra. */
export function BarraSemaforo({ conteo }: { conteo: Record<ColorSemaforo, number> }) {
  const total = ORDEN_SEMAFORO.reduce((s, c) => s + conteo[c], 0);
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Ninguna auditoría tiene hitos u oficios con plazo abierto.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Auditorías por color del semáforo">
        {ORDEN_SEMAFORO.filter((c) => conteo[c] > 0).map((c) => (
          <div
            key={c}
            title={`${COLOR_SEMAFORO_LABELS[c]}: ${conteo[c]}`}
            style={{ width: `${(conteo[c] / total) * 100}%`, background: COLOR_SEMAFORO_CSS_VAR[c] }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
        {ORDEN_SEMAFORO.map((c) => (
          <li key={c} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: COLOR_SEMAFORO_CSS_VAR[c] }} aria-hidden />
            <span className="text-muted-foreground">{COLOR_SEMAFORO_LABELS[c]}</span>
            <span className="ml-auto font-semibold tabular-nums sm:ml-0">{conteo[c]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Barras horizontales de una sola medida. `resaltar` pinta solo la mayor en el color de acento y
 * el resto en gris: la pregunta es "¿cuál es el más alto?", no distinguir series.
 */
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

/** Proporción contra la meta (100%): cuántos se cerraron a tiempo. */
export function Medidor({ titulo, aTiempo, tarde }: { titulo: string; aTiempo: number; tarde: number }) {
  const total = aTiempo + tarde;
  const pct = total > 0 ? Math.round((aTiempo / total) * 100) : null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">{titulo}</span>
        <span className="text-2xl font-bold tabular-nums">{pct === null ? "—" : `${pct}%`}</span>
      </div>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {total > 0 ? (
          <>
            <div style={{ width: `${(aTiempo / total) * 100}%`, background: "var(--status-verde)" }} title={`A tiempo: ${aTiempo}`} />
            <div style={{ width: `${(tarde / total) * 100}%`, background: "var(--status-rojo)" }} title={`Tarde: ${tarde}`} />
          </>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {total > 0 ? `${aTiempo} a tiempo · ${tarde} tarde` : "Todavía no hay registros cerrados."}
      </p>
    </div>
  );
}

/** Antes -> después por etapa: días planeados contra días reales, con la diferencia escrita. */
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
          <li key={f.etapa} className="flex flex-col gap-1.5" title={`${f.etapa}: promedio de ${f.n} hito(s)`}>
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
