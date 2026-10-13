import { esJefaturaAuditoria } from "@/lib/auth";
import {
  agregarDocumentoActividad,
  avanzarDocumento,
  marcarNoAplica,
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
  ETAPA_ACTIVIDAD_LABELS,
  FASE_DOCUMENTO_LABELS,
  TIPO_EVENTO_LABELS,
  type CargoEnum,
  type DocumentoActividad,
  type DocumentoCatalogo,
  type EtapaActividadEnum,
  type FaseDocumentoEnum,
  type Movimiento,
  type Usuario,
} from "@/types/domain";

const FASES: FaseDocumentoEnum[] = ["elaboracion", "revision", "correccion", "finalizado"];

export type DocumentoConDetalle = DocumentoActividad & {
  documentos_catalogo: Pick<DocumentoCatalogo, "nombre" | "etapa" | "orden" | "genera_documento"> | null;
  movimientos: Pick<Movimiento, "id" | "tipo_evento" | "de_cargo" | "a_cargo" | "timestamp" | "corrige_movimiento_id">[];
  ruta_completa: string | null;
};

/**
 * A quién va el documento con la próxima entrega. Espeja la función SQL `avanzar_documento`
 * (que es la que decide de verdad): siempre al primer revisor de la matriz, también después de
 * una corrección — la revisión reinicia (Auditor → Subjefe → Jefe, según corresponda).
 */
function destinoEntrega(_documento: DocumentoConDetalle, cadena: CargoEnum[]): CargoEnum | null {
  return cadena[1] ?? null;
}

const ORDEN_ETAPAS: EtapaActividadEnum[] = ["planificacion", "ejecucion", "comunicacion_resultados", "expediente_cierre"];

type UsuarioPanel = Pick<Usuario, "cargo" | "permiso_sistema"> | null;

export function DocumentosPanel({
  actividadId,
  documentos,
  catalogoDisponible,
  ordenRevisionPorDocumento,
  usuario,
  etapaActual,
  puedeEditar,
}: {
  actividadId: string;
  documentos: DocumentoConDetalle[];
  catalogoDisponible: DocumentoCatalogo[];
  ordenRevisionPorDocumento: Map<string, CargoEnum[]>;
  usuario: UsuarioPanel;
  etapaActual: EtapaActividadEnum;
  puedeEditar: boolean;
}) {
  // La etapa en curso a la vista; las demás plegadas, para no mezclar lo que ya se cerró.
  const grupos = ORDEN_ETAPAS.map((etapa) => ({
    etapa,
    docs: documentos.filter((d) => d.documentos_catalogo?.etapa === etapa),
  })).filter((g) => g.docs.length > 0);

  return (
    <div id="documentos" className="flex scroll-mt-4 flex-col gap-4">
      {grupos.map(({ etapa, docs }) => {
        const terminados = docs.filter((d) => d.fase_actual === "finalizado").length;
        const encabezado = (
          <>
            <span className="font-medium">{ETAPA_ACTIVIDAD_LABELS[etapa]}</span>
            <span className="text-sm text-muted-foreground">
              {terminados} de {docs.length} terminado{docs.length === 1 ? "" : "s"}
            </span>
          </>
        );
        const lista =
          docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ningún documento de esta etapa iniciado todavía.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {docs.map((d) => (
                <DocumentoCard
                  key={d.id}
                  actividadId={actividadId}
                  documento={d}
                  cadena={ordenRevisionPorDocumento.get(d.documento_catalogo_id) ?? []}
                  usuario={usuario}
                  etapaActual={etapaActual}
                  puedeEditar={puedeEditar}
                />
              ))}
            </div>
          );
        return etapa === etapaActual ? (
          <section key={etapa} className="flex flex-col gap-3">
            <h3 className="flex items-baseline gap-3">{encabezado}</h3>
            {lista}
          </section>
        ) : (
          <details key={etapa} className="rounded-xl border">
            <summary className="flex cursor-pointer items-baseline gap-3 p-3">{encabezado}</summary>
            <div className="border-t p-3">{lista}</div>
          </details>
        );
      })}

      {puedeEditar && catalogoDisponible.length > 0 ? (
        <details className="rounded-xl border border-dashed">
          <summary className="cursor-pointer list-none p-3 text-sm font-medium text-primary">
            + Iniciar un documento de {ETAPA_ACTIVIDAD_LABELS[etapaActual]}
          </summary>
          <form action={agregarDocumentoActividad} className="flex flex-wrap items-end gap-3 border-t p-4">
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
                  <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione un documento" /></SelectTrigger>
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
        </details>
      ) : null}
    </div>
  );
}

function DocumentoCard({
  actividadId,
  documento: d,
  cadena,
  usuario,
  etapaActual,
  puedeEditar,
}: {
  actividadId: string;
  documento: DocumentoConDetalle;
  cadena: CargoEnum[];
  usuario: UsuarioPanel;
  etapaActual: EtapaActividadEnum;
  puedeEditar: boolean;
}) {
  const esControlTotal = usuario?.permiso_sistema === "control_total";
  const puedeVistoBueno = usuario?.cargo === "subdirector" || usuario?.cargo === "director";
  // Espeja la validación de `marcar_no_aplica`: decisión de jefatura o control_total.
  const puedeNoAplica = esJefaturaAuditoria(usuario);

  const finalizado = d.fase_actual === "finalizado";
  const enRevision = d.fase_actual === "revision";
  const posicion = cadena.indexOf(d.cargo_actual_responsable);
  const siguiente = posicion >= 0 ? cadena[posicion + 1] ?? null : null;
  const esResponsable = usuario?.cargo === d.cargo_actual_responsable;
  const puedeEntregar =
    !finalizado && !enRevision && (esResponsable || esControlTotal || usuario?.permiso_sistema === "captura_delegada");
  const destino = puedeEntregar ? destinoEntrega(d, cadena) : null;
  const puedeAprobar = enRevision && (esResponsable || esControlTotal);
  const puedeDevolver = enRevision && (esResponsable || esControlTotal || usuario?.permiso_sistema === "captura_delegada");
  const generaDocumento = d.documentos_catalogo?.genera_documento ?? true;
  const hayAcciones = puedeEditar && !d.no_aplica && (!!destino || puedeAprobar || puedeDevolver);
  const meToca = puedeEditar && !finalizado && esResponsable;
  const enEtapaActual = d.documentos_catalogo?.etapa === etapaActual;

  return (
    <div
      id={`doc-${d.id}`}
      className={cn("scroll-mt-4 rounded-xl border p-4", meToca && "border-primary/40 bg-primary/5")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="font-medium">
            {d.documentos_catalogo ? `${d.documentos_catalogo.orden}. ` : ""}
            {d.documentos_catalogo?.nombre ?? "Documento"}
          </p>
          {cadena.length > 0 && !d.no_aplica ? <CadenaRevision cadena={cadena} documento={d} /> : null}
        </div>
        <div className="flex items-center gap-2">
          {meToca ? <Badge>A su cargo</Badge> : null}
          {d.no_aplica ? (
            <Badge variant="outline">No aplica</Badge>
          ) : (
            <Badge variant={finalizado ? "default" : "secondary"}>{FASE_DOCUMENTO_LABELS[d.fase_actual]}</Badge>
          )}
        </div>
      </div>

      {d.no_aplica ? (
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">No aplica: </span>
          {d.no_aplica_justificacion}
        </p>
      ) : null}

      {hayAcciones ? (
        <form action={avanzarDocumento} className="mt-3 flex flex-col gap-2 border-t pt-3">
          <input type="hidden" name="actividad_id" value={actividadId} />
          <input type="hidden" name="documento_actividad_id" value={d.id} />
          <input type="hidden" name="fase_esperada" value={d.fase_actual} />
          <input type="hidden" name="responsable_esperado" value={d.cargo_actual_responsable} />
          <Textarea
            name="observacion"
            rows={1}
            placeholder={enRevision ? "Observación (obligatoria si lo devuelve para corrección)" : "Observación (opcional)"}
          />
          <div className="flex flex-wrap items-center gap-2">
            {destino ? (
              <Button type="submit" name="accion" value="entregar">
                {d.fase_actual === "correccion" ? "Entregar corregido" : "Entregar"} a {CARGO_LABELS[destino]}
              </Button>
            ) : null}
            {puedeAprobar ? (
              <Button type="submit" name="accion" value="aprobar">
                {siguiente ? `Aprobar y pasar a ${CARGO_LABELS[siguiente]}` : "Aprobar y finalizar"}
              </Button>
            ) : null}
            {puedeDevolver ? (
              <Button type="submit" name="accion" value="devolver" variant="outline">
                Devolver al Auditor para corrección
              </Button>
            ) : null}
          </div>
          {puedeDevolver ? (
            <p className="text-xs text-muted-foreground">
              Si lo devuelve, al corregirse la revisión empieza de nuevo: Auditor → Subjefe → Jefe, según corresponda.
            </p>
          ) : null}
        </form>
      ) : null}

      <details className="mt-3 border-t pt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">Más opciones</summary>
        <div className="mt-3 flex flex-col gap-4">
          <Link
            href={`/actividades/${actividadId}/hoja-de-ruta?documento=${d.id}`}
            className="w-fit text-sm text-primary underline-offset-2 hover:underline"
          >
            Ver la hoja de ruta de este documento
          </Link>

          {generaDocumento && !d.no_aplica ? <RutaExpediente ruta={d.ruta_completa} etiqueta="Archivo" /> : null}
          {!generaDocumento ? <p className="text-xs text-muted-foreground">Este paso no genera un archivo.</p> : null}

          {puedeEditar && puedeVistoBueno && !d.no_aplica ? (
            <form action={avanzarDocumento} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="actividad_id" value={actividadId} />
              <input type="hidden" name="documento_actividad_id" value={d.id} />
              <input type="hidden" name="fase_esperada" value={d.fase_actual} />
              <input type="hidden" name="responsable_esperado" value={d.cargo_actual_responsable} />
              <Textarea name="observacion" rows={1} placeholder="Observación (opcional)" className="max-w-md" />
              <Button type="submit" name="accion" value="visto_bueno" size="sm" variant="outline">
                Dejar visto bueno ({CARGO_LABELS[usuario!.cargo!]})
              </Button>
            </form>
          ) : null}

          {puedeEditar && puedeNoAplica && !finalizado ? (
            <form action={marcarNoAplica} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="actividad_id" value={actividadId} />
              <input type="hidden" name="documento_actividad_id" value={d.id} />
              <Textarea
                name="justificacion"
                rows={1}
                required
                minLength={10}
                placeholder="Justificación para marcarlo como No aplica (queda en la bitácora)"
                className="max-w-md"
              />
              <Button type="submit" size="sm" variant="outline">Marcar No aplica</Button>
            </form>
          ) : null}

          {puedeEditar && puedeNoAplica && d.no_aplica && enEtapaActual ? (
            <form action={marcarNoAplica} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="actividad_id" value={actividadId} />
              <input type="hidden" name="documento_actividad_id" value={d.id} />
              <input type="hidden" name="revertir" value="1" />
              <Textarea name="justificacion" rows={1} required minLength={10} placeholder="Motivo para revertir el No aplica" className="max-w-md" />
              <Button type="submit" size="sm" variant="outline">Revertir No aplica</Button>
            </form>
          ) : null}

          {esControlTotal ? <RegistroManual actividadId={actividadId} documento={d} /> : null}
        </div>
      </details>
    </div>
  );
}

/** Dirección: registro tardío (con la fecha real) o corrección de un movimiento anterior. */
function RegistroManual({ actividadId, documento: d }: { actividadId: string; documento: DocumentoConDetalle }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Registro manual de Dirección (registro tardío o corrección)</p>
      <form action={registrarMovimiento} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input type="hidden" name="actividad_id" value={actividadId} />
        <input type="hidden" name="documento_actividad_id" value={d.id} />
        <MovimientoFormFields cargoActual={d.cargo_actual_responsable} />
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground" htmlFor={`fecha_evento-${d.id}`}>
            Cuándo ocurrió (solo si es registro tardío; vacío = ahora)
          </label>
          <Input id={`fecha_evento-${d.id}`} name="fecha_evento" type="datetime-local" />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground" htmlFor={`corrige-${d.id}`}>
            Movimiento que corrige (opcional: deja de contar y queda marcado)
          </label>
          <select
            id={`corrige-${d.id}`}
            name="corrige_movimiento_id"
            defaultValue=""
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Ninguno: es un registro nuevo</option>
            {movimientosCorregibles(d.movimientos).map((m) => (
              <option key={m.id} value={m.id}>
                {new Date(m.timestamp).toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short", timeZone: "America/Guatemala" })}{" "}
                · {TIPO_EVENTO_LABELS[m.tipo_evento]}
                {m.de_cargo ? ` · ${CARGO_LABELS[m.de_cargo]} → ${CARGO_LABELS[m.a_cargo]}` : ` · a ${CARGO_LABELS[m.a_cargo]}`}
              </option>
            ))}
          </select>
        </div>
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

/** Movimientos que todavía se pueden corregir: los que ninguna corrección reemplazó ya. */
function movimientosCorregibles(movimientos: DocumentoConDetalle["movimientos"]) {
  const corregidos = new Set(movimientos.map((m) => m.corrige_movimiento_id).filter(Boolean));
  return movimientos
    .filter((m) => !corregidos.has(m.id))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
