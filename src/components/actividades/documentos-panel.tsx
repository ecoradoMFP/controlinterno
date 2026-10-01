import {
  actualizarRutaDocumento,
  agregarDocumentoActividad,
  avanzarDocumento,
  registrarMovimiento,
} from "@/app/(dashboard)/actividades/[id]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { MovimientoFormFields } from "@/components/actividades/movimiento-form-fields";
import { RutaExpediente } from "@/components/actividades/ruta-expediente";
import { cn } from "@/lib/utils";
import {
  CARGO_LABELS,
  FASE_DOCUMENTO_LABELS,
  type CargoEnum,
  type DocumentoActividad,
  type DocumentoCatalogo,
  type FaseDocumentoEnum,
  type Movimiento,
  type Usuario,
} from "@/types/domain";

const FASES: FaseDocumentoEnum[] = ["elaboracion", "revision", "correccion", "finalizado"];

export type DocumentoConDetalle = DocumentoActividad & {
  documentos_catalogo: Pick<DocumentoCatalogo, "nombre" | "etapa" | "orden" | "genera_documento"> | null;
  movimientos: Pick<Movimiento, "tipo_evento" | "de_cargo" | "timestamp">[];
  ruta_completa: string | null;
};

/**
 * A quién va el documento con la próxima entrega. Espeja la función SQL `avanzar_documento`
 * (que es la que decide de verdad): primera entrega → primer revisor de la matriz; después de
 * una corrección → el cargo que la devolvió.
 */
function destinoEntrega(documento: DocumentoConDetalle, cadena: CargoEnum[]): CargoEnum | null {
  const revisores = cadena.slice(1);
  if (documento.fase_actual === "correccion") {
    const ultimaDevolucion = [...documento.movimientos]
      .filter((m) => m.tipo_evento === "devolucion_correccion")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (ultimaDevolucion?.de_cargo && revisores.includes(ultimaDevolucion.de_cargo)) return ultimaDevolucion.de_cargo;
  }
  return revisores[0] ?? null;
}

export function DocumentosPanel({
  actividadId,
  documentos,
  catalogoDisponible,
  ordenRevisionPorDocumento,
  usuario,
  puedeEditar,
}: {
  actividadId: string;
  documentos: DocumentoConDetalle[];
  catalogoDisponible: DocumentoCatalogo[];
  ordenRevisionPorDocumento: Map<string, CargoEnum[]>;
  usuario: Pick<Usuario, "cargo" | "permiso_sistema"> | null;
  puedeEditar: boolean;
}) {
  const esControlTotal = usuario?.permiso_sistema === "control_total";
  const puedeVistoBueno = usuario?.cargo === "subdirector" || usuario?.cargo === "director";

  return (
    <div className="flex flex-col gap-6">
      {documentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ningún documento del catálogo iniciado todavía.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {documentos.map((d) => {
            const cadena = ordenRevisionPorDocumento.get(d.documento_catalogo_id) ?? [];
            const finalizado = d.fase_actual === "finalizado";
            const enRevision = d.fase_actual === "revision";
            const posicion = cadena.indexOf(d.cargo_actual_responsable);
            const siguiente = posicion >= 0 ? cadena[posicion + 1] ?? null : null;
            const esResponsable = usuario?.cargo === d.cargo_actual_responsable;
            const puedeEntregar =
              !finalizado &&
              !enRevision &&
              (esResponsable || esControlTotal || usuario?.permiso_sistema === "captura_delegada");
            const destino = puedeEntregar ? destinoEntrega(d, cadena) : null;
            const puedeAprobar = enRevision && (esResponsable || esControlTotal);
            const puedeDevolver =
              enRevision && (esResponsable || esControlTotal || usuario?.permiso_sistema === "captura_delegada");
            const generaDocumento = d.documentos_catalogo?.genera_documento ?? true;

            return (
              <div key={d.id} className="rounded-xl border p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-medium">
                      {d.documentos_catalogo ? `${d.documentos_catalogo.orden}. ` : ""}
                      {d.documentos_catalogo?.nombre ?? "Documento"}
                    </p>
                    {cadena.length > 0 ? <CadenaRevision cadena={cadena} documento={d} /> : null}
                  </div>
                  <div className="flex items-center gap-3">
                    {!generaDocumento ? <Badge variant="outline">Sin documento</Badge> : null}
                    <Badge variant={finalizado ? "default" : "secondary"}>{FASE_DOCUMENTO_LABELS[d.fase_actual]}</Badge>
                    <Link
                      href={`/actividades/${actividadId}/hoja-de-ruta?documento=${d.id}`}
                      className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Hoja de ruta
                    </Link>
                  </div>
                </div>

                {puedeEditar && (!finalizado || puedeVistoBueno) ? (
                  <form action={avanzarDocumento} className="flex flex-col gap-2 border-t pt-3">
                    <input type="hidden" name="actividad_id" value={actividadId} />
                    <input type="hidden" name="documento_actividad_id" value={d.id} />
                    <input type="hidden" name="fase_esperada" value={d.fase_actual} />
                    <input type="hidden" name="responsable_esperado" value={d.cargo_actual_responsable} />
                    <Textarea
                      name="observacion"
                      rows={1}
                      placeholder={enRevision ? "Observación (obligatoria si devuelves para corrección)" : "Observación (opcional)"}
                    />
                    <div className="flex flex-wrap gap-2">
                      {destino ? (
                        <Button type="submit" name="accion" value="entregar" size="sm">
                          {d.fase_actual === "correccion" ? "Entregar corregido" : "Entregar"} a {CARGO_LABELS[destino]}
                        </Button>
                      ) : null}
                      {puedeAprobar ? (
                        <Button type="submit" name="accion" value="aprobar" size="sm">
                          {siguiente ? `Aprobar y pasar a ${CARGO_LABELS[siguiente]}` : "Aprobar y finalizar"}
                        </Button>
                      ) : null}
                      {puedeDevolver ? (
                        <Button type="submit" name="accion" value="devolver" size="sm" variant="outline">
                          Devolver al Auditor para corrección
                        </Button>
                      ) : null}
                      {puedeVistoBueno ? (
                        <Button type="submit" name="accion" value="visto_bueno" size="sm" variant="ghost">
                          Dejar visto bueno ({CARGO_LABELS[usuario!.cargo!]})
                        </Button>
                      ) : null}
                      {enRevision && !puedeAprobar && !puedeDevolver ? (
                        <p className="self-center text-xs text-muted-foreground">
                          En revisión de {CARGO_LABELS[d.cargo_actual_responsable]}: lo aprueba o devuelve ese cargo.
                        </p>
                      ) : null}
                      {!finalizado && !enRevision && !puedeEntregar ? (
                        <p className="self-center text-xs text-muted-foreground">
                          En {FASE_DOCUMENTO_LABELS[d.fase_actual].toLowerCase()} con{" "}
                          {CARGO_LABELS[d.cargo_actual_responsable]}: lo entrega ese cargo.
                        </p>
                      ) : null}
                    </div>
                  </form>
                ) : null}

                {generaDocumento ? (
                  <div className="mt-3 flex flex-col gap-2 border-t pt-3">
                    <RutaExpediente ruta={d.ruta_completa} etiqueta="Archivo" />
                    {puedeEditar ? (
                      <form action={actualizarRutaDocumento} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="actividad_id" value={actividadId} />
                        <input type="hidden" name="documento_actividad_id" value={d.id} />
                        <Input
                          name="ruta_archivo"
                          defaultValue={d.ruta_archivo ?? ""}
                          placeholder="Ruta relativa del archivo en el expediente digital"
                          className="h-8 max-w-md text-xs"
                        />
                        <Button type="submit" size="sm" variant="outline" className="h-8">
                          Guardar ruta
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}

                {esControlTotal ? (
                  <details className="mt-3 border-t pt-3">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Registro manual (Dirección: registro tardío o corrección)
                    </summary>
                    <form action={registrarMovimiento} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <input type="hidden" name="actividad_id" value={actividadId} />
                      <input type="hidden" name="documento_actividad_id" value={d.id} />
                      <MovimientoFormFields cargoActual={d.cargo_actual_responsable} />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">Nueva fase (opcional)</label>
                        <Select name="nueva_fase" items={FASE_DOCUMENTO_LABELS}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Sin cambio" /></SelectTrigger>
                          <SelectContent>
                            {FASES.map((f) => (
                              <SelectItem key={f} value={f}>{FASE_DOCUMENTO_LABELS[f]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-3">
                        <label className="text-xs text-muted-foreground">Motivo (obligatorio, queda en la bitácora)</label>
                        <Textarea name="observacion" rows={1} required />
                      </div>
                      <Button type="submit" variant="outline" className="self-end">Registrar</Button>
                    </form>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {puedeEditar && catalogoDisponible.length > 0 ? (
        <form
          action={agregarDocumentoActividad}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-4"
        >
          <input type="hidden" name="actividad_id" value={actividadId} />
          <div className="flex min-w-64 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Documento del catálogo pendiente de iniciar</label>
            {catalogoDisponible.length === 1 ? (
              // Con una sola opción, el Select de Base UI puede abrir y cerrar el popup en
              // el mismo gesto (click o Enter) sin confirmar la selección, dejando el input
              // oculto vacío y bloqueando el submit silenciosamente — mismo bug que el
              // selector de auditor principal en actividad-form.tsx. Con una sola opción no
              // hay nada que elegir, así que se fija igual que ese caso.
              <>
                <Input value={catalogoDisponible[0].nombre} disabled />
                <input type="hidden" name="documento_catalogo_id" value={catalogoDisponible[0].id} />
              </>
            ) : (
              <Select
                name="documento_catalogo_id"
                required
                items={Object.fromEntries(catalogoDisponible.map((c) => [c.id, c.nombre]))}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona un documento" /></SelectTrigger>
                <SelectContent>
                  {catalogoDisponible.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button type="submit" variant="outline">Iniciar documento</Button>
        </form>
      ) : null}
    </div>
  );
}

/** Auditor → Subjefe → Jefe ..., con el cargo que tiene el documento resaltado. */
function CadenaRevision({ cadena, documento }: { cadena: CargoEnum[]; documento: DocumentoConDetalle }) {
  const finalizado = documento.fase_actual === "finalizado";
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs">
      {cadena.map((cargo, i) => {
        const actual = !finalizado && cargo === documento.cargo_actual_responsable;
        return (
          <li key={cargo} className="flex items-center gap-1">
            {i > 0 ? <span className="text-muted-foreground">→</span> : null}
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5",
                actual ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {CARGO_LABELS[cargo]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
