import { cn } from "@/lib/utils";
import { COLOR_SEMAFORO_LABELS, type ColorSemaforo } from "@/lib/semaforo";

/** "neutral": estados fuera del semáforo, como un oficio sin plazo todavía. */
export type TonoSemaforo = ColorSemaforo | "neutral";

const TONO_CLASSES: Record<TonoSemaforo, string> = {
  verde: "bg-[var(--status-verde-bg)] text-[var(--status-verde-fg)]",
  amarillo: "bg-[var(--status-amarillo-bg)] text-[var(--status-amarillo-fg)]",
  naranja: "bg-[var(--status-naranja-bg)] text-[var(--status-naranja-fg)]",
  rojo: "bg-[var(--status-rojo-bg)] text-[var(--status-rojo-fg)]",
  neutral: "bg-muted text-muted-foreground",
};

const TONO_DOT_CLASSES: Record<TonoSemaforo, string> = {
  verde: "bg-[var(--status-verde)]",
  amarillo: "bg-[var(--status-amarillo)]",
  naranja: "bg-[var(--status-naranja)]",
  rojo: "bg-[var(--status-rojo)]",
  neutral: "bg-muted-foreground/50",
};

/** Los mismos colores como variable CSS, para gráficas que no usan clases. */
export const COLOR_SEMAFORO_CSS_VAR: Record<ColorSemaforo, string> = {
  verde: "var(--status-verde)",
  amarillo: "var(--status-amarillo)",
  naranja: "var(--status-naranja)",
  rojo: "var(--status-rojo)",
};

export function SemaforoChip({ tono, label }: { tono: TonoSemaforo; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONO_CLASSES[tono],
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", TONO_DOT_CLASSES[tono])} aria-hidden />
      {label}
    </span>
  );
}

export function SemaforoBadge({ color }: { color: ColorSemaforo }) {
  return <SemaforoChip tono={color} label={COLOR_SEMAFORO_LABELS[color]} />;
}
