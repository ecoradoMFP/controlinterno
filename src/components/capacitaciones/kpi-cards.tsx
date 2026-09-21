import { AlertTriangle, Clock, Target } from "lucide-react";
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
        icon={Target}
        label="Cumplimiento de la meta (50h)"
        value={`${pctCumplidas.toFixed(0)}%`}
        detail={`${personasCumplidas} de ${totalPersonas} personas`}
      />
      <StatCard
        icon={Clock}
        label="Horas promedio por persona"
        value={horasPromedio.toFixed(1)}
        detail="del año seleccionado"
      />
      <StatCard
        icon={AlertTriangle}
        tone="destructive"
        label="Sin ninguna capacitación registrada"
        value={String(personasSinRegistro)}
        detail={totalPersonas > 0 ? `${((personasSinRegistro / totalPersonas) * 100).toFixed(0)}% del personal` : undefined}
      />
    </div>
  );
}
