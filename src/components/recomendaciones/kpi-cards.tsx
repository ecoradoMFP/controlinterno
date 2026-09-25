import { AlarmClock, CheckCircle2, ListChecks, XCircle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

export function RecomendacionesKpiCards({
  abiertas,
  vencidas,
  noCumplidas,
  cumplidas,
  total,
}: {
  abiertas: number;
  vencidas: number;
  noCumplidas: number;
  cumplidas: number;
  total: number;
}) {
  const pctCumplidas = total > 0 ? (cumplidas / total) * 100 : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Mismos tonos que ESTADO_RECOMENDACION_TONO (no_cumplida=rojo, cumplida=verde); las
       * vencidas usan naranja, igual que el semáforo de plazos. */}
      <StatCard
        icon={ListChecks}
        label="Abiertas"
        value={String(abiertas)}
        detail="Pendientes, en proceso o no cumplidas"
      />
      <StatCard
        icon={AlarmClock}
        tone="naranja"
        label="Vencidas"
        value={String(vencidas)}
        detail="Abiertas con fecha de implementación pasada"
      />
      <StatCard icon={XCircle} tone="rojo" label="No cumplidas" value={String(noCumplidas)} />
      <StatCard
        icon={CheckCircle2}
        tone="verde"
        label="Cumplidas"
        value={String(cumplidas)}
        detail={total > 0 ? `${pctCumplidas.toFixed(0)}% del total` : undefined}
      />
    </div>
  );
}
