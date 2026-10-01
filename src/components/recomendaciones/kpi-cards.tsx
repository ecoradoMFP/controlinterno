import Link from "next/link";
import { AlarmClock, CheckCircle2, History, ListChecks } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

export function RecomendacionesKpiCards({
  activas,
  vencidas,
  enSeguimiento,
  atendidas,
}: {
  activas: number;
  vencidas: number;
  enSeguimiento: number;
  atendidas: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Mismos tonos que ESTADO_RECOMENDACION_TONO; las vencidas usan naranja, igual que el
       * semáforo de plazos. "En seguimiento" y "Atendidas" llevan a sus propios paneles. */}
      <StatCard icon={ListChecks} label="Activas" value={String(activas)} detail="Pendientes, en proceso o no cumplidas" />
      <StatCard
        icon={AlarmClock}
        tone="naranja"
        label="Vencidas"
        value={String(vencidas)}
        detail="Activas con fecha de implementación pasada"
      />
      <Link href="/recomendaciones/en-seguimiento" className="block">
        <StatCard
          icon={CheckCircle2}
          tone="amarillo"
          label="En seguimiento"
          value={String(enSeguimiento)}
          detail="Ya evaluadas este año, sin quedar cumplidas"
        />
      </Link>
      <Link href="/recomendaciones/historico" className="block">
        <StatCard icon={History} tone="verde" label="Atendidas" value={String(atendidas)} detail="Histórico por año" />
      </Link>
    </div>
  );
}
