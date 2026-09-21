import type { Cumplimiento } from "@/lib/bi";
import { StatCard } from "@/components/ui/stat-card";

function Card({ titulo, cumplimiento }: { titulo: string; cumplimiento: Cumplimiento }) {
  const total = cumplimiento.aTiempo + cumplimiento.tarde;
  const pctATiempo = total > 0 ? (cumplimiento.aTiempo / total) * 100 : 0;

  return (
    <StatCard
      label={titulo}
      value={cumplimiento.pct !== null ? `${cumplimiento.pct.toFixed(0)}%` : "—"}
      detail={`${cumplimiento.aTiempo} a tiempo · ${cumplimiento.tarde} tarde`}
    >
      {total > 0 ? (
        <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--status-rojo)]/25">
          <div
            className="h-full rounded-full bg-[var(--status-verde)] transition-[width] duration-500"
            style={{ width: `${pctATiempo}%` }}
          />
        </div>
      ) : null}
    </StatCard>
  );
}

export function CumplimientoCards({
  hitos,
  oficios,
}: {
  hitos: Cumplimiento;
  oficios: Cumplimiento;
}) {
  return (
    <div className="rounded-xl border shadow-sm">
      <div className="border-b p-4">
        <h2 className="font-medium">Cumplimiento histórico de plazos</h2>
        <p className="text-xs text-muted-foreground">
          % de hitos y oficios ya concluidos/respondidos que se cerraron dentro del plazo
          esperado, dentro de tu alcance.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <Card titulo="Hitos de cronograma concluidos a tiempo" cumplimiento={hitos} />
        <Card titulo="Oficios respondidos a tiempo" cumplimiento={oficios} />
      </div>
    </div>
  );
}
