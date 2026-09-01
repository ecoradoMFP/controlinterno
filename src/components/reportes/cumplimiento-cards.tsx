import type { Cumplimiento } from "@/lib/bi";

function Card({ titulo, cumplimiento }: { titulo: string; cumplimiento: Cumplimiento }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-2xl font-semibold">
        {cumplimiento.pct !== null ? `${cumplimiento.pct.toFixed(0)}%` : "—"}
      </p>
      <p className="text-xs text-muted-foreground">
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
