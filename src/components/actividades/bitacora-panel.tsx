import { Badge } from "@/components/ui/badge";
import { CARGO_LABELS, TIPO_EVENTO_LABELS, type Movimiento } from "@/types/domain";

type MovimientoConContexto = Movimiento & {
  documentos_actividad: { documentos_catalogo: { nombre: string } | null } | null;
  registrado_por: { nombre: string } | null;
};

export function BitacoraPanel({ movimientos }: { movimientos: MovimientoConContexto[] }) {
  if (movimientos.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay movimientos registrados.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {movimientos.map((m) => (
        <li key={m.id} className="rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">
              {m.documentos_actividad?.documentos_catalogo?.nombre ?? "Documento"}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(m.timestamp).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">
            {TIPO_EVENTO_LABELS[m.tipo_evento]}
            {m.de_cargo ? ` · ${CARGO_LABELS[m.de_cargo]} → ${CARGO_LABELS[m.a_cargo]}` : ` · a ${CARGO_LABELS[m.a_cargo]}`}
            {" · registrado por "}
            {m.registrado_por?.nombre ?? m.registrado_por_nit}
          </p>
          {m.observacion ? <p className="mt-1 italic">&ldquo;{m.observacion}&rdquo;</p> : null}
          {m.es_correccion_direccion ? (
            <Badge variant="destructive" className="mt-2">
              Corrección de Dirección
            </Badge>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
