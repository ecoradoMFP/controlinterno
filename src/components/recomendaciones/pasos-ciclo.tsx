import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PasoCiclo = {
  titulo: string;
  detalle?: string | null;
  estado: "hecho" | "actual" | "pendiente";
};

export function PasosCiclo({ pasos, etiqueta = "Avance del seguimiento" }: { pasos: PasoCiclo[]; etiqueta?: string }) {
  const columnas = pasos.length === 5 ? "sm:grid-cols-5" : "sm:grid-cols-4";
  return (
    <ol className={cn("grid gap-3", columnas)} aria-label={etiqueta}>
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
