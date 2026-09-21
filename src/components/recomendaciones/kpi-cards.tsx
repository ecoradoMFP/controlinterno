import { CheckCircle2, Clock, FileText, ListChecks } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

export function RecomendacionesKpiCards({
  totalInformes,
  totalRecomendaciones,
  pendientes,
  enProceso,
  atendidas,
}: {
  totalInformes: number;
  totalRecomendaciones: number;
  pendientes: number;
  enProceso: number;
  atendidas: number;
}) {
  const pctAtendidas = totalRecomendaciones > 0 ? (atendidas / totalRecomendaciones) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <StatCard icon={FileText} label="Informes de auditoría" value={String(totalInformes)} />
      {/* Mismos tonos que ESTADO_RECOMENDACION_TONO — el ícono de cada tarjeta hace eco del
       * SemaforoChip correspondiente más abajo en la misma página. */}
      <StatCard icon={ListChecks} tone="rojo" label="Recomendaciones pendientes" value={String(pendientes)} />
      <StatCard icon={Clock} tone="amarillo" label="En proceso" value={String(enProceso)} />
      <StatCard
        icon={CheckCircle2}
        tone="verde"
        label="Atendidas"
        value={String(atendidas)}
        detail={totalRecomendaciones > 0 ? `${pctAtendidas.toFixed(0)}% del total` : undefined}
      />
    </div>
  );
}
