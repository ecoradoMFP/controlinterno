import { agregarHito, concluirHito } from "@/app/(dashboard)/actividades/[id]/actions";
import { Badge } from "@/components/ui/badge";
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
import {
  calcularSemaforo,
  cumplidoATiempo,
  COLOR_SEMAFORO_CLASSES,
  COLOR_SEMAFORO_LABELS,
  type UmbralSemaforo,
} from "@/lib/semaforo";

const ETAPAS_HITO: EtapaDocumentoEnum[] = ["planificacion", "ejecucion", "comunicacion_resultados"];

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
  return (
    <div className="flex flex-col gap-6">
      {hitos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ningún hito capturado todavía.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {hitos.map((h) => (
            <div key={h.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {h.codigo_jerarquico} — {h.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ETAPA_ACTIVIDAD_LABELS[h.etapa]} · Responsable: {CARGO_LABELS[h.cargo_responsable]}
                    {h.documentos_catalogo ? ` · Produce: ${h.documentos_catalogo.nombre}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.fecha_inicio_esperada} — {h.fecha_fin_esperada} ({h.dias_habiles_esperados} días hábiles)
                  </p>
                </div>
                <EstadoHito hito={h} feriados={feriados} umbral={umbral} hoy={hoy} />
              </div>

              {puedeEditar && !h.fecha_fin_real ? (
                <form action={concluirHito} className="flex items-end gap-3 border-t pt-3">
                  <input type="hidden" name="actividad_id" value={actividadId} />
                  <input type="hidden" name="hito_id" value={h.id} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">Fecha real de conclusión</label>
                    <Input name="fecha_fin_real" type="date" required className="h-8" />
                  </div>
                  <Button type="submit" size="sm" variant="outline">
                    Marcar concluido
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {puedeEditar ? (
        <form
          action={agregarHito}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-4"
        >
          <input type="hidden" name="actividad_id" value={actividadId} />
          <div className="flex w-28 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Código</label>
            <Input name="codigo_jerarquico" placeholder="1.7.1" required />
          </div>
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Nombre del hito</label>
            <Input name="nombre" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Etapa</label>
            <Select name="etapa" required items={Object.fromEntries(ETAPAS_HITO.map((e) => [e, ETAPA_ACTIVIDAD_LABELS[e]]))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {ETAPAS_HITO.map((e) => (
                  <SelectItem key={e} value={e}>{ETAPA_ACTIVIDAD_LABELS[e]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Responsable</label>
            <Select name="cargo_responsable" required items={Object.fromEntries(CARGOS.map((c) => [c, CARGO_LABELS[c]]))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {CARGOS.map((c) => (
                  <SelectItem key={c} value={c}>{CARGO_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Inicio esperado</label>
            <Input name="fecha_inicio_esperada" type="date" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Fin esperado</label>
            <Input name="fecha_fin_esperada" type="date" required />
          </div>
          <div className="flex w-32 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Días hábiles</label>
            <Input name="dias_habiles_esperados" type="number" min={0} step={1} required />
          </div>
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
          <Button type="submit" variant="outline">Agregar hito</Button>
        </form>
      ) : null}
    </div>
  );
}

function EstadoHito({
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
    return <Badge variant={aTiempo ? "secondary" : "destructive"}>{aTiempo ? "Concluido a tiempo" : "Concluido tarde"}</Badge>;
  }
  const color = calcularSemaforo(hito.fecha_inicio_esperada, hito.fecha_fin_esperada, hoy, feriados, umbral);
  return <Badge className={COLOR_SEMAFORO_CLASSES[color]}>{COLOR_SEMAFORO_LABELS[color]}</Badge>;
}
