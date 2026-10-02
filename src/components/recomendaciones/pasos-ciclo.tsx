import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PasoCiclo = {
  titulo: string;
  detalle?: string | null;
  estado: "hecho" | "actual" | "pendiente";
};

// Indicador de en qué punto va un nombramiento de seguimiento: nombramiento -> evaluar ->
// emitir -> SAG-UDAI. Está para que quien llega a la pantalla vea de un vistazo qué falta y cuál
// es EL paso que sigue, sin tener que deducirlo de formularios sueltos.
export function PasosCiclo({ pasos }: { pasos: PasoCiclo[] }) {
  const columnas = pasos.length === 5 ? "sm:grid-cols-5" : "sm:grid-cols-4";
  return (
    <ol className={cn("grid gap-3", columnas)} aria-label="Avance del seguimiento">
      {pasos.map((p, i) => (
        <li
          key={p.titulo}
          aria-current={p.estado === "actual" ? "step" : undefined}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3",
            p.estado === "actual" && "border-primary bg-primary/5",
            p.estado === "pendiente" && "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
              p.estado === "hecho" && "border-primary bg-primary text-primary-foreground",
              p.estado === "actual" && "border-primary text-primary",
            )}
          >
            {p.estado === "hecho" ? <CheckIcon className="size-4" aria-hidden /> : i + 1}
          </span>
          <span className="min-w-0 text-sm">
            <span className={cn("block font-medium", p.estado !== "pendiente" && "text-foreground")}>{p.titulo}</span>
            {p.detalle ? <span className="block text-xs text-muted-foreground">{p.detalle}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
