function Card({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-2xl font-semibold">{valor}</p>
      {detalle ? <p className="mt-1.5 text-xs text-muted-foreground">{detalle}</p> : null}
    </div>
  );
}

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
      <Card titulo="Informes de auditoría" valor={String(totalInformes)} />
      <Card titulo="Recomendaciones pendientes" valor={String(pendientes)} />
      <Card titulo="En proceso" valor={String(enProceso)} />
      <Card
        titulo="Atendidas"
        valor={String(atendidas)}
        detalle={totalRecomendaciones > 0 ? `${pctAtendidas.toFixed(0)}% del total` : undefined}
      />
    </div>
  );
}
