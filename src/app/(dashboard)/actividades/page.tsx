import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { identificadorAuditoria } from "@/lib/auditoria";
import { hoyGuatemala } from "@/lib/recomendaciones";
import {
  COLOR_SEMAFORO_LABELS,
  semaforoConMotivoPorActividad,
  SEVERIDAD,
  UMBRAL_POR_DEFECTO,
  type UmbralSemaforo,
} from "@/lib/semaforo";
import { FiltrosAutomaticos } from "@/components/recomendaciones/filtros-automaticos";
import { SemaforoChip } from "@/components/semaforo-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { sinTildes } from "@/lib/texto";
import { CARGO_LABELS, ETAPA_ACTIVIDAD_LABELS, type EtapaActividadEnum } from "@/types/domain";

type Filtros = { vista?: string; etapa?: string; departamento?: string; q?: string };

const RUTA = "/actividades";
const ETAPAS: EtapaActividadEnum[] = ["planificacion", "ejecucion", "comunicacion_resultados", "expediente_cierre"];
const SELECT_CLASES =
  "h-10 w-auto max-w-64 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Bandeja de auditorías, pensada para leerse sin esfuerzo: pocas tarjetas que filtran (pendientes a
 * su cargo, requieren atención, en curso, concluidas), tres filtros y, por auditoría, solo su CAI,
 * dependencia, etapa y semáforo. El detalle completo está dentro de cada auditoría.
 */
export default async function ActividadesPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  // Sin filtro explícito por departamento/cargo: RLS (authz.puede_ver_actividad) ya devuelve
  // exactamente el alcance correcto para quien esté autenticado (sección 8).
  const [
    { data: actividades, error },
    { data: documentos },
    { data: hitosAbiertos },
    { data: parametros },
    { data: feriadosRows },
  ] = await Promise.all([
    supabase
      .from("actividades")
      .select(
        "id, cai, anio_cai, no_nombramiento, dependencia_auditada, tipo_auditoria, etapa_actual, fecha_notificacion, concluida, departamento_id, departamentos(nombre), auditor_principal:usuarios!actividades_auditor_principal_nit_fkey(nombre)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("documentos_actividad").select("actividad_id, fase_actual, cargo_actual_responsable, documentos_catalogo(etapa)"),
    supabase.from("hitos_cronograma").select("actividad_id, nombre, fecha_inicio_esperada, fecha_fin_esperada").is("fecha_fin_real", null),
    supabase.from("parametros_semaforo").select("*"),
    supabase.from("calendario_feriados").select("fecha"),
  ]);

  const hoy = hoyGuatemala();
  const umbral = new Map((parametros ?? []).map((p) => [p.ambito, p as UmbralSemaforo]));
  const semaforo = semaforoConMotivoPorActividad(
    hitosAbiertos ?? [],
    hoy,
    new Set((feriadosRows ?? []).map((f) => f.fecha)),
    umbral.get("hito") ?? UMBRAL_POR_DEFECTO,
  );

  // "Te toca": documentos de la etapa en curso que tiene tu cargo (mismo criterio que el detalle).
  const cargo = puedeEscribir(usuario) ? (usuario?.cargo ?? null) : null;
  const filas = (actividades ?? []).map((a) => {
    const docsEtapa = (documentos ?? []).filter((d) => d.actividad_id === a.id && d.documentos_catalogo?.etapa === a.etapa_actual);
    const abiertos = a.concluida ? [] : docsEtapa.filter((d) => d.fase_actual !== "finalizado");
    const sem = a.concluida ? null : (semaforo.get(a.id) ?? null);
    return {
      ...a,
      sem,
      meTocan: cargo ? abiertos.filter((d) => d.cargo_actual_responsable === cargo).length : 0,
      enRiesgo: !!sem && (sem.color === "naranja" || sem.color === "rojo"),
    };
  });
  type Fila = (typeof filas)[number];

  const veDepartamentos = usuario?.cargo === "director" || usuario?.cargo === "subdirector";
  const q = sinTildes(filtros.q ?? "").trim();

  type Aplicados = { vista?: string; etapa?: string; departamento?: string };
  const aplicados: Aplicados = {
    vista: filtros.vista || undefined,
    etapa: filtros.etapa || undefined,
    departamento: veDepartamentos ? filtros.departamento || undefined : undefined,
  };
  const campoDe = (f: Fila, campo: "etapa" | "departamento") => (campo === "etapa" ? f.etapa_actual : f.departamento_id);
  const coincide = (f: Fila, omitir?: keyof Aplicados) => {
    if (omitir !== "vista") {
      const v = aplicados.vista ?? "en_curso";
      if (v === "en_curso" && f.concluida) return false;
      if (v === "concluidas" && !f.concluida) return false;
      if (v === "te_toca" && f.meTocan === 0) return false;
      if (v === "riesgo" && !f.enRiesgo) return false;
    }
    for (const campo of ["etapa", "departamento"] as const) {
      if (omitir !== campo && aplicados[campo] && campoDe(f, campo) !== aplicados[campo]) return false;
    }
    if (q) {
      const texto = [identificadorAuditoria(f), f.no_nombramiento, f.dependencia_auditada, f.auditor_principal?.nombre]
        .join(" ");
      if (!sinTildes(texto).includes(q)) return false;
    }
    return true;
  };
  // Un filtro que ya no deja resultados con los demás se descarta (nunca una combinación vacía).
  for (const campo of ["etapa", "departamento"] as const) {
    if (aplicados[campo] && !filas.some((f) => coincide(f, campo) && campoDe(f, campo) === aplicados[campo])) {
      aplicados[campo] = undefined;
    }
  }
  const vista = aplicados.vista ?? "en_curso";

  const base = filas.filter((f) => coincide(f, "vista"));
  const visibles = filas
    .filter((f) => coincide(f))
    // Lo más grave primero; a igual color, la que antes vence su plazo de notificación.
    .sort(
      (a, b) =>
        Number(a.concluida) - Number(b.concluida) ||
        (b.sem ? SEVERIDAD[b.sem.color] : -1) - (a.sem ? SEVERIDAD[a.sem.color] : -1) ||
        (a.fecha_notificacion ?? "9999").localeCompare(b.fecha_notificacion ?? "9999"),
    );

  const conteos = (campo: "etapa" | "departamento") => {
    const mapa = new Map<string, number>();
    for (const f of filas) {
      const clave = campoDe(f, campo);
      if (!clave) continue;
      mapa.set(clave, (mapa.get(clave) ?? 0) + (coincide(f, campo) ? 1 : 0));
    }
    return mapa;
  };
  const cEtapa = conteos("etapa");
  const cDepartamento = conteos("departamento");
  const nombreDepartamento = new Map(filas.map((f) => [f.departamento_id, f.departamentos?.nombre ?? ""]));
  const hayFiltros = !!(aplicados.vista || aplicados.etapa || aplicados.departamento || q);

  const urlCon = (cambios: Filtros) => {
    const params = new URLSearchParams(
      Object.entries({ ...aplicados, q: filtros.q, ...cambios }).filter((e): e is [string, string] => !!e[1]),
    );
    const qs = params.toString();
    return `${RUTA}${qs ? `?${qs}` : ""}`;
  };
  const kpi = (
    clave: string,
    label: string,
    detail: string,
    valor: number,
    tone: "neutral" | "naranja" | "verde",
  ) => (
    // Volver a hacer clic en la tarjeta activa regresa a "En curso".
    <Link
      key={clave}
      href={urlCon({ vista: vista === clave ? "" : clave })}
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
          <h1 className="text-xl font-semibold">Auditorías (CAI)</h1>
          <p className="text-muted-foreground">Seleccione una auditoría para ver en qué etapa se encuentra y qué le falta.</p>
        </div>
        {puedeEscribir(usuario) ? (
          <Button size="lg" render={<Link href="/actividades/nueva" />}>
            Registrar nueva auditoría
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-destructive">No se pudieron cargar las auditorías.</p> : null}

      <div className={cn("grid auto-rows-fr grid-cols-2 gap-3", cargo ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        {cargo
          ? kpi("te_toca", "Pendientes a su cargo", `Documentos que esperan al ${CARGO_LABELS[cargo]}`, base.filter((f) => f.meTocan > 0).length, "neutral")
          : null}
        {kpi("riesgo", "Requieren atención", "Plazo por vencer o vencido", base.filter((f) => f.enRiesgo).length, "naranja")}
        {kpi("en_curso", "En curso", "Auditorías sin concluir", base.filter((f) => !f.concluida).length, "neutral")}
        {kpi("concluidas", "Concluidas", "Entregadas al archivo", base.filter((f) => f.concluida).length, "verde")}
      </div>

      <div className="tarjeta">
        <FiltrosAutomaticos ruta={RUTA} className="flex flex-wrap items-center gap-3 border-b p-4">
          <input type="hidden" name="vista" value={aplicados.vista ?? ""} />
          <Input
            name="q"
            type="text"
            defaultValue={filtros.q ?? ""}
            placeholder="Buscar por CAI o dependencia"
            aria-label="Buscar por CAI o dependencia"
            className="h-10 min-w-64 flex-1 sm:max-w-sm"
          />
          <select key={`etapa-${aplicados.etapa}`} name="etapa" defaultValue={aplicados.etapa ?? ""} className={SELECT_CLASES} aria-label="Etapa">
            <option value="">Todas las etapas</option>
            {ETAPAS.filter((e) => cEtapa.has(e)).map((e) => (
              <option key={e} value={e} disabled={!cEtapa.get(e)}>
                {ETAPA_ACTIVIDAD_LABELS[e]} ({cEtapa.get(e)})
              </option>
            ))}
          </select>
          {veDepartamentos ? (
            <select key={`departamento-${aplicados.departamento}`} name="departamento" defaultValue={aplicados.departamento ?? ""} className={SELECT_CLASES} aria-label="Departamento">
              <option value="">Todos los departamentos</option>
              {[...cDepartamento.keys()]
                .sort((x, y) => (nombreDepartamento.get(x) ?? "").localeCompare(nombreDepartamento.get(y) ?? ""))
                .map((id) => (
                  <option key={id} value={id} disabled={!cDepartamento.get(id)}>
                    {nombreDepartamento.get(id)} ({cDepartamento.get(id)})
                  </option>
                ))}
            </select>
          ) : null}
          {hayFiltros ? (
            <Button variant="outline" nativeButton={false} render={<Link href={RUTA} />}>
              Quitar filtros
            </Button>
          ) : null}
        </FiltrosAutomaticos>

        {visibles.length === 0 ? (
          <p className="p-6 text-muted-foreground">
            {filas.length === 0
              ? "Todavía no hay auditorías registradas que usted pueda consultar."
              : vista === "te_toca" && !q
                ? "No tiene documentos pendientes en ninguna auditoría."
                : "Ninguna auditoría coincide con la búsqueda."}
          </p>
        ) : (
          <ul className="divide-y">
            {visibles.map((f) => (
              <FilaAuditoria key={f.id} fila={f} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type FilaVista = {
  id: string;
  cai: string | null;
  anio_cai: number | null;
  no_nombramiento: string;
  dependencia_auditada: string;
  tipo_auditoria: string;
  etapa_actual: EtapaActividadEnum;
  fecha_notificacion: string;
  concluida: boolean;
  departamentos: { nombre: string } | null;
  auditor_principal: { nombre: string } | null;
  sem: { color: "verde" | "amarillo" | "naranja" | "rojo"; motivo: string } | null;
  meTocan: number;
  enRiesgo: boolean;
};

function FilaAuditoria({ fila: f }: { fila: FilaVista }) {
  return (
    <li>
      <Link
        href={`/actividades/${f.id}`}
        className="group flex flex-col gap-3 p-5 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="codigo-expediente text-lg font-semibold">{identificadorAuditoria(f)}</span>
            <span className="text-lg">{f.dependencia_auditada}</span>
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {f.concluida ? "Concluida" : `Etapa: ${ETAPA_ACTIVIDAD_LABELS[f.etapa_actual]}`}
            </span>
            {f.departamentos?.nombre ? ` · ${f.departamentos.nombre}` : ""}
          </p>
          {f.enRiesgo && f.sem ? <p className="text-sm text-muted-foreground">Motivo: {f.sem.motivo}.</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {f.meTocan > 0 ? <Badge className="h-7 px-3 text-sm">Pendiente a su cargo</Badge> : null}
          {f.sem ? <SemaforoChip tono={f.sem.color} label={COLOR_SEMAFORO_LABELS[f.sem.color]} /> : null}
          <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 font-medium text-primary group-hover:bg-background">
            Ver auditoría <ChevronRight className="size-4" aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  );
}

