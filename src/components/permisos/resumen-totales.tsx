import { StatCard } from "@/components/ui/stat-card";
import { cantidad, formatearMinutos, type Totales } from "@/lib/permisos";

export function ResumenTotales({ totales, periodo }: { totales: Totales; periodo: string }) {
  const { minutos, veces } = totales;
  const extras = [
    veces.comision_oficial ? cantidad(veces.comision_oficial, "comisión oficial", "comisiones oficiales") : null,
    veces.nota_marcaje ? cantidad(veces.nota_marcaje, "nota de marcaje", "notas de marcaje") : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Permisos personales" value={`${formatearMinutos(minutos.asunto_personal)} h`} detail={cantidad(veces.asunto_personal, "permiso", "permisos")} destacada />
        <StatCard label="Citas médicas" value={`${formatearMinutos(minutos.cita_medica)} h`} detail={cantidad(veces.cita_medica, "cita", "citas")} />
        <StatCard label="Entradas tarde" value={`${formatearMinutos(minutos.entrada_tardia)} h`} detail={cantidad(veces.entrada_tardia, "vez", "veces")} tone="naranja" />
      </div>
      <p className="text-sm text-muted-foreground">
        {periodo}.{extras.length ? ` Además: ${extras.join(" y ")} (no suman horas).` : ""}
      </p>
    </div>
  );
}
