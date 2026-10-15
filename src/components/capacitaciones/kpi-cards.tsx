import { StatCard } from "@/components/ui/stat-card";

export function CapacitacionKpiCards({
  totalPersonas,
  personasCumplidas,
  personasSinRegistro,
  horasPromedio,
}: {
  totalPersonas: number;
  personasCumplidas: number;
  personasSinRegistro: number;
  horasPromedio: number;
}) {
  const pctCumplidas = totalPersonas > 0 ? (personasCumplidas / totalPersonas) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        label="Cumplen la meta"
        value={`${pctCumplidas.toFixed(0)}%`}
        detail={`${personasCumplidas} de ${totalPersonas} personas`}
      />
      <StatCard
        label="Horas promedio por persona"
        value={horasPromedio.toFixed(1)}
      />
      <StatCard
        tone="rojo"
        label="Sin capacitaciones"
        value={String(personasSinRegistro)}
        detail={totalPersonas > 0 ? `${((personasSinRegistro / totalPersonas) * 100).toFixed(0)}% del personal` : undefined}
      />
    </div>
  );
}
