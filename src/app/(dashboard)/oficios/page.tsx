import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { identificadorAuditoria } from "@/lib/auditoria";
import { hoyGuatemala } from "@/lib/recomendaciones";
import { FiltrosAutomaticos } from "@/components/recomendaciones/filtros-automaticos";
import { SemaforoChip, type TonoSemaforo } from "@/components/semaforo-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { sinTildes } from "@/lib/texto";
import { calcularSemaforo, cumplidoATiempo, UMBRAL_POR_DEFECTO, COLOR_SEMAFORO_LABELS, type UmbralSemaforo } from "@/lib/semaforo";
import type { Oficio } from "@/types/domain";

const RUTA = "/oficios";

const fecha = (iso: string) => iso.split("-").reverse().join("/");

function estadoOficio(
  o: Pick<Oficio, "fecha_emision" | "fecha_respuesta" | "fecha_vencimiento">,
  hoy: string,
  feriados: ReadonlySet<string>,
  umbral: UmbralSemaforo,
): { tono: TonoSemaforo; label: string; atencion: boolean } {
  if (o.fecha_respuesta) {
    const aTiempo = !o.fecha_vencimiento || cumplidoATiempo(o.fecha_vencimiento, o.fecha_respuesta);
    return { tono: aTiempo ? "verde" : "amarillo", label: aTiempo ? "Respondido a tiempo" : "Respondido tarde", atencion: false };
  }
  if (!o.fecha_vencimiento) return { tono: "neutral", label: "Sin plazo", atencion: false };
  const color = calcularSemaforo(o.fecha_emision, o.fecha_vencimiento, hoy, feriados, umbral);
  return { tono: color, label: COLOR_SEMAFORO_LABELS[color], atencion: color === "naranja" || color === "rojo" };
}

export default async function OficiosPage({ searchParams }: { searchParams: Promise<{ vista?: string; q?: string }> }) {
  const { vista: vistaParam, q: qParam } = await searchParams;
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  const [{ data: oficios, error }, { data: parametros }, { data: feriadosRows }] = await Promise.all([
    supabase
      .from("oficios")
      .select(
        "id, no_oficio, destinatario, dependencia_destino, asunto, fecha_emision, fecha_vencimiento, fecha_respuesta, fecha_envio, actividades(cai, anio_cai, no_nombramiento)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("parametros_semaforo").select("*").eq("ambito", "oficio").maybeSingle(),
    supabase.from("calendario_feriados").select("fecha"),
  ]);

  const feriados = new Set((feriadosRows ?? []).map((f) => f.fecha));
  const umbral = (parametros as UmbralSemaforo | null) ?? UMBRAL_POR_DEFECTO;
  const hoy = hoyGuatemala();
  const q = sinTildes(qParam ?? "").trim();

  const filas = (oficios ?? []).map((o) => ({ ...o, estado: estadoOficio(o, hoy, feriados, umbral) }));
  const coincideTexto = (o: (typeof filas)[number]) =>
    !q ||
    sinTildes([o.no_oficio, o.destinatario, o.dependencia_destino ?? "", o.asunto, o.actividades ? identificadorAuditoria(o.actividades) : ""].join(" ")).includes(q);
  const base = filas.filter(coincideTexto);
  const vista = ["atencion", "respondidos", "todos"].includes(vistaParam ?? "") ? vistaParam! : "pendientes";
  const visibles = base
    .filter((o) =>
      vista === "pendientes" ? !o.fecha_respuesta : vista === "atencion" ? o.estado.atencion : vista === "respondidos" ? !!o.fecha_respuesta : true,
    )
    .sort(
      (a, b) =>
        Number(!!a.fecha_respuesta) - Number(!!b.fecha_respuesta) ||
        (a.fecha_vencimiento ?? "9999").localeCompare(b.fecha_vencimiento ?? "9999"),
    );

  const urlCon = (v: string) => {
    const params = new URLSearchParams(Object.entries({ vista: v === "pendientes" ? "" : v, q: qParam ?? "" }).filter(([, x]) => x));
    return `${RUTA}${params.size ? `?${params}` : ""}`;
  };
  const kpi = (clave: string, label: string, detail: string, valor: number, tone: "neutral" | "naranja" | "verde") => (
    <Link
      key={clave}
      href={urlCon(vista === clave ? "pendientes" : clave)}
      aria-pressed={vista === clave}
      className={"block h-full rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"}
    >
      <StatCard tone={tone} label={label} value={String(valor)} detail={detail} destacada={vista === clave} enlace className="h-full hover:border-primary/40" />
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Oficios</h1>
          <p className="text-muted-foreground">Seleccione un oficio para registrar su envío, recepción o respuesta.</p>
        </div>
        {puedeEscribir(usuario) ? (
          <Button size="lg" render={<Link href="/oficios/nueva" />}>
            Registrar nuevo oficio
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-destructive">No se pudieron cargar los oficios.</p> : null}

      <div className="grid auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-4">
        {kpi("pendientes", "Sin respuesta", "Esperan respuesta de la dependencia", base.filter((o) => !o.fecha_respuesta).length, "neutral")}
        {kpi("atencion", "Requieren atención", "Plazo por vencer o vencido", base.filter((o) => o.estado.atencion).length, "naranja")}
        {kpi("respondidos", "Respondidos", "Ya tienen respuesta", base.filter((o) => !!o.fecha_respuesta).length, "verde")}
        {kpi("todos", "Todos", "Sin importar el estado", base.length, "neutral")}
      </div>

      <div className="tarjeta">
        <FiltrosAutomaticos ruta={RUTA} className="flex flex-wrap items-center gap-3 border-b p-4">
          <input type="hidden" name="vista" value={vista === "pendientes" ? "" : vista} />
          <Input
            name="q"
            type="text"
            defaultValue={qParam ?? ""}
            placeholder="Buscar por número, destinatario, dependencia, asunto o CAI"
            aria-label="Buscar oficios"
            className="h-10 min-w-64 flex-1 sm:max-w-md"
          />
          {q || vista !== "pendientes" ? (
            <Button variant="outline" nativeButton={false} render={<Link href={RUTA} />}>
              Quitar filtros
            </Button>
          ) : null}
        </FiltrosAutomaticos>

        {visibles.length === 0 ? (
          <p className="p-6 text-muted-foreground">
            {filas.length === 0
              ? "Todavía no hay oficios registrados que usted pueda consultar."
              : vista === "pendientes" && !q
                ? "No hay oficios esperando respuesta."
                : "Ningún oficio coincide con la búsqueda."}
          </p>
        ) : (
          <ul className="divide-y">
            {visibles.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/oficios/${o.id}`}
                  className="group flex flex-col gap-3 p-5 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="codigo-expediente text-lg font-semibold">{o.no_oficio}</span>
                      {o.actividades ? <span className="text-muted-foreground">{identificadorAuditoria(o.actividades)}</span> : null}
                    </p>
                    <p className="line-clamp-2 text-lg">{o.asunto}</p>
                    <p className="text-muted-foreground">
                      Para: <span className="text-foreground">{[o.destinatario, o.dependencia_destino].filter(Boolean).join(", ")}</span>
                      {!o.fecha_respuesta && o.fecha_vencimiento ? ` · Debe responder a más tardar el ${fecha(o.fecha_vencimiento)}` : ""}
                      {!o.fecha_envio ? " · Falta registrar el envío" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <SemaforoChip tono={o.estado.tono} label={o.estado.label} />
                    <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 font-medium text-primary group-hover:bg-background">
                      Ver oficio <ChevronRight className="size-4" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

