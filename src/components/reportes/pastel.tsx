"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type PorcionPastel = {
  clave: string;
  etiqueta: string;
  valor: number;
  color: string;
};

const pct = (valor: number, total: number) =>
  `${Math.round((valor / total) * 100)}%`;

/** Gráfica de pie con el porcentaje de cada parte escrito en la leyenda. */
export function Pastel({
  porciones,
  centro,
  vacio,
}: {
  porciones: PorcionPastel[];
  centro?: string;
  vacio: string;
}) {
  const total = porciones.reduce((s, p) => s + p.valor, 0);
  if (total === 0)
    return <p className="text-sm text-muted-foreground">{vacio}</p>;
  const conDatos = porciones.filter((p) => p.valor > 0);

  return (
    <div className="@container">
      <div className="flex flex-col items-center gap-4 @sm:flex-row @sm:gap-6">
        <div className="relative size-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={conDatos}
                dataKey="valor"
                nameKey="etiqueta"
                innerRadius="62%"
                outerRadius="100%"
                paddingAngle={conDatos.length > 1 ? 3 : 0}
                cornerRadius={6}
                stroke="none"
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
              >
                {conDatos.map((p) => (
                  <Cell key={p.clave} fill={p.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(valor, nombre) =>
                  [`${valor} (${pct(Number(valor), total)})`, nombre] as [
                    string,
                    string,
                  ]
                }
              />
            </PieChart>
          </ResponsiveContainer>
          {centro ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums">{total}</span>
              <span className="text-xs text-muted-foreground">{centro}</span>
            </div>
          ) : null}
        </div>
        <ul className="flex w-full min-w-0 flex-col gap-2 text-sm">
          {porciones.map((p) => (
            <li key={p.clave} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: p.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">{p.etiqueta}</span>
              <span className="tabular-nums text-muted-foreground">
                {p.valor}
              </span>
              <span className="w-11 text-right font-semibold tabular-nums">
                {pct(p.valor, total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
