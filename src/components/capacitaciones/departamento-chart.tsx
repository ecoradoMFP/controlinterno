"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HORAS_OBJETIVO_ANUAL } from "@/lib/capacitacion";

export interface FilaDepartamentoCapacitacion {
  departamento: string;
  horasPromedio: number;
  personas: number;
}

export function DepartamentoCapacitacionChart({ datos }: { datos: FilaDepartamentoCapacitacion[] }) {
  if (datos.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Todavía no hay personal dentro de tu alcance.</p>;
  }

  const data = datos.map((d) => ({
    departamento: d.departamento,
    "Horas promedio": Number(d.horasPromedio.toFixed(1)),
    personas: d.personas,
  }));

  return (
    <div className="h-64 w-full p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="departamento" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            label={{ value: "Horas promedio", angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            formatter={(value, name, item) => [`${value} horas`, `${name} (${item.payload.personas} personas)`] as [string, string]}
          />
          <Bar dataKey="Horas promedio" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">Meta anual: {HORAS_OBJETIVO_ANUAL} horas por persona</p>
    </div>
  );
}
