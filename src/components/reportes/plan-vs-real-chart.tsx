"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ETAPA_DOCUMENTO_LABELS } from "@/types/domain";
import type { PlanVsReal } from "@/lib/bi";

export function PlanVsRealChart({ datos }: { datos: PlanVsReal[] }) {
  if (datos.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Todavía no hay hitos concluidos dentro de tu alcance para comparar plan vs. real.
      </p>
    );
  }

  const data = datos.map((d) => ({
    etapa: ETAPA_DOCUMENTO_LABELS[d.etapa],
    Plan: Number(d.planPromedio.toFixed(1)),
    Real: Number(d.realPromedio.toFixed(1)),
    n: d.n,
  }));

  return (
    <div className="h-72 w-full p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="etapa" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            label={{ value: "Días hábiles promedio", angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            formatter={(value, name, item) => [`${value} días`, `${name} (n=${item.payload.n})`] as [string, string]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
          <Bar dataKey="Plan" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
          <Bar dataKey="Real" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
