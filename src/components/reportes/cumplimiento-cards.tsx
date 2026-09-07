import type { Cumplimiento } from "@/lib/bi";

function Card({ titulo, cumplimiento }: { titulo: string; cumplimiento: Cumplimiento }) {
  const total = cumplimiento.aTiempo + cumplimiento.tarde;
  const pctATiempo = total > 0 ? (cumplimiento.aTiempo / total) * 100 : 0;

  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-2xl font-semibold">
        {cumplimiento.pct !== null ? `${cumplimiento.pct.toFixed(0)}%` : "—"}
      </p>
      {total > 0 ? (
        <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--status-rojo)]/25">
          <div className="h-full bg-[var(--status-verde)]" style={{ width: `${pctATiempo}%` }} />
        </div>
      ) : null}
      <p className="mt-1.5 text-xs text-muted-foreground">
        {cumplimiento.aTiempo} a tiempo · {cumplimiento.tarde} tarde
      </p>
    </div>
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
    <div className="rounded-lg border">
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
