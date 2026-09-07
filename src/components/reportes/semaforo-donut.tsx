"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { COLOR_SEMAFORO_CSS_VAR } from "@/components/semaforo-chip";
import { COLOR_SEMAFORO_LABELS, type ColorSemaforo } from "@/lib/semaforo";

const ORDEN: ColorSemaforo[] = ["verde", "amarillo", "naranja", "rojo"];

export function SemaforoDonut({ conteo }: { conteo: Record<ColorSemaforo, number> }) {
  const total = ORDEN.reduce((suma, color) => suma + conteo[color], 0);
  const datos = ORDEN.map((color) => ({ color, nombre: COLOR_SEMAFORO_LABELS[color], valor: conteo[color] }));

  if (total === 0) {
    return (
      <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-full border border-dashed text-center text-xs text-muted-foreground">
        Sin actividades
        <br />
        con semáforo activo
      </div>
    );
  }

  return (
    <div className="relative h-40 w-40 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={datos}
            dataKey="valor"
            nameKey="nombre"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={datos.filter((d) => d.valor > 0).length > 1 ? 3 : 0}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {datos.map((d) => (
              <Cell key={d.color} fill={COLOR_SEMAFORO_CSS_VAR[d.color]} />
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
            formatter={(value, nombre) => [`${value} (${Math.round((Number(value) / total) * 100)}%)`, nombre]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">{total}</span>
        <span className="text-[11px] text-muted-foreground">actividades</span>
      </div>
    </div>
  );
}
