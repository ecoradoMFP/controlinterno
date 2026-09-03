import { cn } from "@/lib/utils";
import { COLOR_SEMAFORO_LABELS, type ColorSemaforo } from "@/lib/semaforo";

/** "neutral" cubre estados que no son parte del semáforo de 4 colores (p. ej. un oficio sin
 * plazo capturado todavía) pero deben verse como parte de la misma familia visual. */
export type TonoSemaforo = ColorSemaforo | "neutral";

const TONO_CLASSES: Record<TonoSemaforo, string> = {
  verde: "border-emerald-600/30 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-300",
  amarillo: "border-amber-600/30 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-300",
  naranja: "border-orange-600/30 bg-orange-50 text-orange-900 dark:border-orange-400/30 dark:bg-orange-950/40 dark:text-orange-300",
  rojo: "border-red-600/30 bg-red-50 text-red-900 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300",
  neutral: "border-border bg-muted text-muted-foreground",
};

const TONO_DOT_CLASSES: Record<TonoSemaforo, string> = {
  verde: "bg-emerald-600 dark:bg-emerald-400",
  amarillo: "bg-amber-500 dark:bg-amber-400",
  naranja: "bg-orange-600 dark:bg-orange-400",
  rojo: "bg-red-600 dark:bg-red-400",
  neutral: "bg-muted-foreground/50",
};

/**
 * Chip del semáforo — rectangular y timbrado (no la píldora redonda genérica de Badge), con un
 * punto de color adelante del texto. Es la firma visual del sistema: el semáforo es el concepto
 * central de la sección 5 del prompt maestro, así que se ve distinto a cualquier otro badge de
 * la app (documentos_actividad, permisos, etc.), que sí quedan como píldora.
 */
export function SemaforoChip({ tono, label }: { tono: TonoSemaforo; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        TONO_CLASSES[tono],
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONO_DOT_CLASSES[tono])} aria-hidden />
      {label}
    </span>
  );
}

export function SemaforoBadge({ color }: { color: ColorSemaforo }) {
  return <SemaforoChip tono={color} label={COLOR_SEMAFORO_LABELS[color]} />;
}
