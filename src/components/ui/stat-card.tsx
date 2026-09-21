import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Mismos 4 tonos del semáforo (sección 5) más "accent"/"primary"/"destructive" — para que el
 * ícono de una tarjeta de métrica pueda hacer eco del mismo color que ya usa un badge/chip
 * relacionado en la misma página (p. ej. "Pendientes" en rojo, igual que su SemaforoChip). */
type StatCardTone = "accent" | "primary" | "destructive" | "verde" | "amarillo" | "naranja" | "rojo";

const TONE_CLASSES: Record<StatCardTone, string> = {
  // Azul vivo institucional (--ring, #0099cc) — tono por defecto de las tarjetas de métrica.
  // Da más vida que el navy de --primary, que ya está reservado para el sidebar y los CTA.
  accent: "bg-[var(--ring)]/10 text-[var(--ring)]",
  primary: "bg-primary/10 text-primary",
  destructive: "bg-destructive/10 text-destructive",
  verde: "bg-[var(--status-verde)]/10 text-[var(--status-verde)]",
  amarillo: "bg-[var(--status-amarillo)]/10 text-[var(--status-amarillo)]",
  naranja: "bg-[var(--status-naranja)]/10 text-[var(--status-naranja)]",
  rojo: "bg-[var(--status-rojo)]/10 text-[var(--status-rojo)]",
};

/**
 * Tarjeta de métrica reutilizable: número grande + label en versalitas + ícono de acento con
 * fondo tenue (10% de opacidad, nunca un bloque plano saturado). Es la unidad base de los
 * dashboards de Capacitaciones, Recomendaciones y Reportes.
 */
export function StatCard({
  icon: Icon,
  tone = "accent",
  label,
  value,
  detail,
  children,
  className,
}: {
  icon?: LucideIcon;
  tone?: StatCardTone;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow duration-300 hover:shadow-md md:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-xl",
              TONE_CLASSES[tone],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 font-heading text-2xl font-bold md:text-3xl">{value}</p>
      {children}
      {detail ? <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
