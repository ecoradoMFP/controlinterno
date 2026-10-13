import { agregarHito, concluirHito } from "@/app/(dashboard)/actividades/[id]/actions";
import { CronogramaSagUdaiForm } from "@/components/actividades/cronograma-sag-udai-form";
import { FechasHitoFields } from "@/components/actividades/fechas-hito-fields";
import { SemaforoChip } from "@/components/semaforo-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CARGOS,
  CARGO_LABELS,
  ETAPA_ACTIVIDAD_LABELS,
  type DocumentoCatalogo,
  type EtapaDocumentoEnum,
  type HitoCronograma,
} from "@/types/domain";
import { calcularSemaforo, cumplidoATiempo, COLOR_SEMAFORO_LABELS, type UmbralSemaforo } from "@/lib/semaforo";

const ETAPAS: EtapaDocumentoEnum[] = ["planificacion", "ejecucion", "comunicacion_resultados"];

/** "2026-03-26" → "26/03/2026" */
const fecha = (iso: string) => iso.split("-").reverse().join("/");

/**
 * Cronograma de actividades de la auditoría. Las 8 actividades con plazo en el SAG-UDAI-WEB (que
 * se reporta a la CGC) se capturan de una vez con solo sus fechas; el semáforo mide cada una
 * contra su plazo. (En la base, cada actividad es una fila de `hitos_cronograma`.)
 */
export function CronogramaPanel({
  actividadId,
  hitos,
  catalogo,
  feriados,
  umbral,
  hoy,
  puedeEditar,
}: {
  actividadId: string;
  hitos: (HitoCronograma & { documentos_catalogo: Pick<DocumentoCatalogo, "nombre"> | null })[];
  catalogo: DocumentoCatalogo[];
  feriados: ReadonlySet<string>;
  umbral: UmbralSemaforo;
  hoy: string;
  puedeEditar: boolean;
}) {
  const ordenadas = [...hitos].sort((a, b) =>
    a.codigo_jerarquico.localeCompare(b.codigo_jerarquico, "es", { numeric: true }),
  );
  const totalDias = ordenadas.reduce((s, h) => s + h.dias_habiles_esperados, 0);

  return (
    <div id="cronograma" className="flex scroll-mt-4 flex-col gap-5">
      <div className="rounded-xl bg-muted/50 p-4">
        <p className="font-medium">Cronograma de actividades</p>
        <p className="text-sm text-muted-foreground">
          Son los plazos que se registran en el SAG-UDAI-WEB y se reportan a la Contraloría General de Cuentas, por eso
          deben respetarse. El semáforo indica, para cada actividad sin concluir, si va a tiempo. Una etapa no puede
          cerrarse mientras tenga actividades sin concluir.
        </p>
      </div>

      {ordenadas.length === 0 ? (
        puedeEditar ? (
          <CronogramaSagUdaiForm actividadId={actividadId} asuetos={[...feriados]} />
        ) : (
          <p className="text-muted-foreground">Todavía no se ha registrado el cronograma de esta auditoría.</p>
        )
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-sm text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">No.</th>
                <th className="p-3 font-medium">Actividad</th>
                <th className="p-3 font-medium">Del</th>
                <th className="p-3 font-medium">Al</th>
                <th className="p-3 text-right font-medium">Días hábiles</th>
                <th className="p-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ordenadas.map((h) => (
                <tr key={h.id} id={`hito-${h.id}`} className="scroll-mt-4 align-top">
                  <td className="p-3">{h.codigo_jerarquico}</td>
                  <td className="p-3">
                    <p className="font-medium">{h.nombre}</p>
                    <p className="text-sm text-muted-foreground">{ETAPA_ACTIVIDAD_LABELS[h.etapa]}</p>
                  </td>
                  <td className="p-3 whitespace-nowrap">{fecha(h.fecha_inicio_esperada)}</td>
                  <td className="p-3 whitespace-nowrap">{fecha(h.fecha_fin_esperada)}</td>
                  <td className="p-3 text-right">{h.dias_habiles_esperados}</td>
                  <td className="p-3">
                    <div className="flex flex-col items-start gap-2">
                      <EstadoActividad hito={h} feriados={feriados} umbral={umbral} hoy={hoy} />
                      {puedeEditar && !h.fecha_fin_real ? (
                        <details>
                          <summary className="cursor-pointer text-sm text-primary">Marcar como concluida</summary>
                          <form action={concluirHito} className="mt-2 flex flex-wrap items-end gap-2">
                            <input type="hidden" name="actividad_id" value={actividadId} />
                            <input type="hidden" name="hito_id" value={h.id} />
                            <label className="flex flex-col gap-1 text-sm">
                              Fecha en que concluyó
                              <Input name="fecha_fin_real" type="date" required defaultValue={hoy} className="h-9 w-40" />
                            </label>
                            <Button type="submit" size="sm">
                              Confirmar
                            </Button>
                          </form>
                        </details>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/30">
              <tr>
                <td colSpan={4} className="p-3 font-medium">
                  Total de días hábiles para realizar la auditoría
                </td>
                <td className="p-3 text-right font-semibold">{totalDias}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {puedeEditar && ordenadas.length > 0 ? (
        <details className="rounded-xl border border-dashed">
          <summary className="cursor-pointer list-none p-3 text-sm font-medium text-primary">
            + Agregar otra actividad al cronograma
          </summary>
          <form action={agregarHito} className="flex flex-wrap items-end gap-3 border-t p-4">
            <input type="hidden" name="actividad_id" value={actividadId} />
            <div className="flex w-24 flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">No.</label>
              <Input name="codigo_jerarquico" placeholder="1.1" required />
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Actividad</label>
              <Input name="nombre" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Etapa</label>
              <Select name="etapa" required items={Object.fromEntries(ETAPAS.map((e) => [e, ETAPA_ACTIVIDAD_LABELS[e]]))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  {ETAPAS.map((e) => (
                    <SelectItem key={e} value={e}>{ETAPA_ACTIVIDAD_LABELS[e]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Responsable</label>
              <Select name="cargo_responsable" required items={Object.fromEntries(CARGOS.map((c) => [c, CARGO_LABELS[c]]))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  {CARGOS.map((c) => (
                    <SelectItem key={c} value={c}>{CARGO_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FechasHitoFields asuetos={[...feriados]} />
            <div className="flex min-w-56 flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Documento que produce (opcional)</label>
              <Select name="documento_catalogo_id" items={Object.fromEntries(catalogo.map((c) => [c.id, c.nombre]))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                <SelectContent>
                  {catalogo.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="outline">Agregar actividad</Button>
          </form>
        </details>
      ) : null}
    </div>
  );
}

function EstadoActividad({
  hito,
  feriados,
  umbral,
  hoy,
}: {
  hito: HitoCronograma;
  feriados: ReadonlySet<string>;
  umbral: UmbralSemaforo;
  hoy: string;
}) {
  if (hito.fecha_fin_real) {
    const aTiempo = cumplidoATiempo(hito.fecha_fin_esperada, hito.fecha_fin_real);
    return (
      <SemaforoChip
        tono={aTiempo ? "verde" : "amarillo"}
        label={`${aTiempo ? "Concluida a tiempo" : "Concluida tarde"} (${fecha(hito.fecha_fin_real)})`}
      />
    );
  }
  const color = calcularSemaforo(hito.fecha_inicio_esperada, hito.fecha_fin_esperada, hoy, feriados, umbral);
  return <SemaforoChip tono={color} label={COLOR_SEMAFORO_LABELS[color]} />;
}
