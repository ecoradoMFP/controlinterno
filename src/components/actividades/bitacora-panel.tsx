import { Badge } from "@/components/ui/badge";
import { CARGO_LABELS, TIPO_EVENTO_LABELS, type Movimiento } from "@/types/domain";

type MovimientoConContexto = Movimiento & {
  documentos_actividad: { documentos_catalogo: { nombre: string } | null } | null;
  registrado_por: { nombre: string } | null;
};

const FORMATO: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" };

export function MarcasMovimiento({ movimiento, corregidoPor }: { movimiento: Movimiento; corregidoPor?: Movimiento }) {
  const tardio = new Date(movimiento.registrado_en).getTime() - new Date(movimiento.timestamp).getTime() > 3_600_000;
  return (
    <>
      {corregidoPor ? (
        <p className="mt-1 text-xs font-medium text-destructive">
          Corregido por Dirección el {new Date(corregidoPor.registrado_en).toLocaleString("es-GT", FORMATO)}: ya no cuenta en la
          hoja de ruta ni en los reportes.
        </p>
      ) : null}
      {movimiento.es_correccion_direccion ? (
        <Badge variant="destructive" className="mt-2">
          {movimiento.corrige_movimiento_id ? "Corrección de Dirección (reemplaza un movimiento)" : "Corrección de Dirección"}
        </Badge>
      ) : null}
      {tardio ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Registro tardío: se anotó el {new Date(movimiento.registrado_en).toLocaleString("es-GT", FORMATO)}.
        </p>
      ) : null}
    </>
  );
}

export function BitacoraPanel({ movimientos }: { movimientos: MovimientoConContexto[] }) {
  if (movimientos.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay movimientos registrados.</p>;
  }

  const correccionDe = new Map(movimientos.filter((m) => m.corrige_movimiento_id).map((m) => [m.corrige_movimiento_id!, m]));

  return (
    <ol className="flex flex-col gap-3">
      {movimientos.map((m) => {
        const corregidoPor = correccionDe.get(m.id);
        return (
          <li key={m.id} className={corregidoPor ? "rounded-xl border border-dashed p-3 text-sm opacity-70" : "rounded-xl border p-3 text-sm"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={corregidoPor ? "font-medium line-through" : "font-medium"}>
                {m.documentos_actividad?.documentos_catalogo?.nombre ?? "Documento"}
              </span>
              <span className="text-xs text-muted-foreground">{new Date(m.timestamp).toLocaleString("es-GT", FORMATO)}</span>
            </div>
            <p className={corregidoPor ? "mt-1 text-muted-foreground line-through" : "mt-1 text-muted-foreground"}>
              {TIPO_EVENTO_LABELS[m.tipo_evento]}
              {m.de_cargo ? ` · ${CARGO_LABELS[m.de_cargo]} → ${CARGO_LABELS[m.a_cargo]}` : ` · a ${CARGO_LABELS[m.a_cargo]}`}
              {" · registrado por "}
              {m.registrado_por?.nombre ?? m.registrado_por_nit}
            </p>
            {m.observacion ? <p className="mt-1 italic">&ldquo;{m.observacion}&rdquo;</p> : null}
            <MarcasMovimiento movimiento={m} corregidoPor={corregidoPor} />
          </li>
        );
      })}
    </ol>
  );
}
