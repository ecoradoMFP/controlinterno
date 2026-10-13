import { COLOR_SEMAFORO_CSS_VAR, SemaforoChip } from "@/components/semaforo-chip";
import { calcularSemaforo, cumplidoATiempo, COLOR_SEMAFORO_LABELS, type UmbralSemaforo } from "@/lib/semaforo";
import type { HitoCronograma } from "@/types/domain";

const DIA = 86_400_000;
const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const dma = (iso: string) => iso.split("-").reverse().join("/");
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * Diagrama de Gantt del cronograma: por actividad, el plazo planificado (gris) y lo real encima
 * (color del semáforo; las concluidas, verde si fue a tiempo y amarillo si tarde; lo que pasa del
 * plazo, rojo), con una línea en el día de hoy. La tabla de abajo es la vista en texto.
 */
export function GanttCronograma({
  hitos,
  hoy,
  feriados,
  umbral,
  compacto = false,
}: {
  hitos: HitoCronograma[];
  hoy: string;
  feriados: ReadonlySet<string>;
  umbral: UmbralSemaforo;
  /** Para imprimir: sin ancho mínimo ni desplazamiento, filas más bajas y sin la nota del cursor. */
  compacto?: boolean;
}) {
  if (hitos.length === 0) return null;
  const columnas = compacto ? "grid-cols-[240px_1fr]" : "grid-cols-[300px_1fr]";
  const fechas = hitos.flatMap((h) => [h.fecha_inicio_esperada, h.fecha_fin_esperada, ...(h.fecha_fin_real ? [h.fecha_fin_real] : [])]);
  const desde = Math.min(...fechas.map(ms), ms(hoy)) - 2 * DIA;
  const hasta = Math.max(...fechas.map(ms), ms(hoy)) + 3 * DIA;
  const pct = (iso: string, finDelDia = false) => ((ms(iso) + (finDelDia ? DIA : 0) - desde) / (hasta - desde)) * 100;
  const tramo = (a: string, b: string) => ({ left: `${pct(a)}%`, width: `${Math.max(pct(b, true) - pct(a), 0.6)}%` });

  // Marcas de mes en el eje.
  const meses: { iso: string; etiqueta: string }[] = [];
  const d = new Date(desde);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  while (d.getTime() < hasta) {
    meses.push({ iso: d.toISOString().slice(0, 10), etiqueta: `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}` });
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  const hoyPct = pct(hoy) + (100 / ((hasta - desde) / DIA)) / 2;

  return (
    <section className={`flex flex-col rounded-xl border ${compacto ? "gap-1 p-3" : "gap-3 p-4"}`} aria-label="Diagrama de Gantt del cronograma">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-medium">Línea de tiempo: planificado contra real</h3>
        <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground ${compacto ? "text-xs" : "text-sm"}`}>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-6 rounded-sm border border-foreground/20 bg-muted" aria-hidden /> Planificado
          </li>
          {(
            [
              ["verde", "A tiempo"],
              ["amarillo", "Riesgo leve o concluida tarde"],
              ["naranja", "Riesgo moderado"],
              ["rojo", "Riesgo grave o atraso"],
            ] as const
          ).map(([tono, texto]) => (
            <li key={tono} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-6 rounded-sm" style={{ background: COLOR_SEMAFORO_CSS_VAR[tono] }} aria-hidden /> {texto}
            </li>
          ))}
          {compacto ? (
            <li className="flex items-center gap-1.5 font-medium text-primary">
              <span className="inline-block h-3 border-l-2 border-dashed border-primary" aria-hidden /> Hoy, {dma(hoy)}
            </li>
          ) : null}
        </ul>
      </div>

      <div className={compacto ? "" : "overflow-x-auto"}>
        <div className={compacto ? "" : "min-w-[780px]"}>
          {/* Eje de meses */}
          <div className={`grid ${columnas} text-xs text-muted-foreground`}>
            <div />
            <div className="relative h-6 border-b">
              {meses.map((m) => (
                <span key={m.iso} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: `${pct(m.iso)}%` }}>
                  {m.etiqueta}
                </span>
              ))}
            </div>
          </div>

          <ul className="relative">
            {hitos.map((h) => {
              let real: { a: string; b: string; color: string } | null = null;
              let atraso: { a: string; b: string } | null = null;
              let estado: string;
              let chip: React.ReactNode;
              if (h.fecha_fin_real) {
                const aTiempo = cumplidoATiempo(h.fecha_fin_esperada, h.fecha_fin_real);
                real = { a: h.fecha_inicio_esperada, b: h.fecha_fin_real, color: COLOR_SEMAFORO_CSS_VAR[aTiempo ? "verde" : "amarillo"] };
                estado = `concluida el ${dma(h.fecha_fin_real)} (${aTiempo ? "a tiempo" : "tarde"})`;
                chip = <SemaforoChip tono={aTiempo ? "verde" : "amarillo"} label={aTiempo ? "A tiempo" : "Tarde"} />;
              } else {
                const color = calcularSemaforo(h.fecha_inicio_esperada, h.fecha_fin_esperada, hoy, feriados, umbral);
                if (hoy >= h.fecha_inicio_esperada) {
                  real = { a: h.fecha_inicio_esperada, b: hoy < h.fecha_fin_esperada ? hoy : h.fecha_fin_esperada, color: COLOR_SEMAFORO_CSS_VAR[color] };
                }
                if (hoy > h.fecha_fin_esperada) atraso = { a: h.fecha_fin_esperada, b: hoy };
                const porIniciar = hoy < h.fecha_inicio_esperada;
                estado = porIniciar ? "aún no inicia" : `en curso, ${COLOR_SEMAFORO_LABELS[color].toLowerCase()}`;
                chip = porIniciar ? (
                  <span className="text-xs text-muted-foreground">Por iniciar</span>
                ) : (
                  <SemaforoChip tono={color} label={COLOR_SEMAFORO_LABELS[color]} />
                );
              }
              const descripcion = `${h.codigo_jerarquico}. ${h.nombre}: planificada del ${dma(h.fecha_inicio_esperada)} al ${dma(h.fecha_fin_esperada)}; ${estado}.`;
              return (
                <li key={h.id} className={`grid ${columnas} break-inside-avoid items-center border-b last:border-b-0`} title={descripcion}>
                  {compacto ? (
                    <span className="truncate py-1 pr-3 text-xs font-medium">
                      {h.codigo_jerarquico}. {h.nombre}
                    </span>
                  ) : (
                    <div className="flex flex-col gap-1 py-2 pr-3">
                      <span className="text-sm font-medium">
                        {h.codigo_jerarquico}. {h.nombre}
                      </span>
                      <span>{chip}</span>
                    </div>
                  )}
                  <div className={compacto ? "relative h-7" : "relative h-12"}>
                    <span
                      className="absolute top-1/2 h-5 -translate-y-1/2 rounded-sm border border-foreground/20 bg-muted"
                      style={tramo(h.fecha_inicio_esperada, h.fecha_fin_esperada)}
                    />
                    {real ? (
                      <span
                        className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-sm ring-2 ring-background"
                        style={{ ...tramo(real.a, real.b), background: real.color }}
                      />
                    ) : null}
                    {atraso ? (
                      <span
                        className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-sm ring-2 ring-background"
                        style={{ ...tramo(atraso.a, atraso.b), background: COLOR_SEMAFORO_CSS_VAR.rojo }}
                      />
                    ) : null}
                    <span className="sr-only">{descripcion}</span>
                  </div>
                </li>
              );
            })}
            {/* Hoy */}
            <li aria-hidden className={`pointer-events-none absolute inset-y-0 right-0 ${compacto ? "left-[240px]" : "left-[300px]"}`}>
              <span className="absolute inset-y-0 border-l-2 border-dashed border-primary" style={{ left: `${hoyPct}%` }} />
            </li>
          </ul>
          {compacto ? null : (
            <div className={`grid ${columnas} text-xs font-medium text-primary`}>
              <div />
              <div className="relative h-5">
                <span className="absolute -translate-x-1/2" style={{ left: `${hoyPct}%` }}>
                  Hoy, {dma(hoy)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      {compacto ? null : (
        <p className="text-sm text-muted-foreground">Pase el cursor sobre una actividad para ver sus fechas. El detalle está en la tabla de abajo.</p>
      )}
    </section>
  );
}
