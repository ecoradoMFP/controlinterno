import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

type StatCardTone = "neutral" | "verde" | "amarillo" | "naranja" | "rojo";

const TONE_PUNTO: Record<StatCardTone, string> = {
  neutral: "bg-primary text-primary-foreground",
  verde: "bg-[var(--status-verde)] text-white",
  amarillo: "bg-[var(--status-amarillo)] text-[#3d2f00]",
  naranja: "bg-[var(--status-naranja)] text-white",
  rojo: "bg-[var(--status-rojo)] text-white",
};

/**
 * Indicador: etiqueta, número y detalle. `destacada` la rellena con el azul institucional (la
 * tarjeta activa de un filtro, o la principal del tablero). `enlace` muestra la flecha de "ver".
 */
export function StatCard({
  tone = "neutral",
  label,
  value,
  detail,
  destacada = false,
  enlace = false,
  children,
  className,
}: {
  tone?: StatCardTone;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  destacada?: boolean;
  enlace?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-4 transition-colors md:p-5",
        destacada ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-sm font-medium", destacada ? "text-primary-foreground/85" : "text-muted-foreground")}>{label}</p>
        {enlace ? (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full",
              destacada ? "bg-primary-foreground text-primary" : TONE_PUNTO[tone],
            )}
            aria-hidden
          >
            <ArrowUpRight className="size-4" />
          </span>
        ) : tone !== "neutral" ? (
          <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", TONE_PUNTO[tone])} aria-hidden />
        ) : null}
      </div>
      <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums">{value}</p>
      {children}
      {detail ? (
        <p className={cn("mt-auto pt-2 text-sm", destacada ? "text-primary-foreground/75" : "text-muted-foreground")}>{detail}</p>
      ) : null}
    </div>
  );
}
