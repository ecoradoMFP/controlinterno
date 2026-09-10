function Card({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-2xl font-semibold">{valor}</p>
      {detalle ? <p className="mt-1.5 text-xs text-muted-foreground">{detalle}</p> : null}
    </div>
  );
}

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
      <Card
        titulo="Cumplimiento de la meta (50h)"
        valor={`${pctCumplidas.toFixed(0)}%`}
        detalle={`${personasCumplidas} de ${totalPersonas} personas`}
      />
      <Card titulo="Horas promedio por persona" valor={horasPromedio.toFixed(1)} detalle="del año seleccionado" />
      <Card
        titulo="Sin ninguna capacitación registrada"
        valor={String(personasSinRegistro)}
        detalle={totalPersonas > 0 ? `${((personasSinRegistro / totalPersonas) * 100).toFixed(0)}% del personal` : undefined}
      />
    </div>
  );
}
