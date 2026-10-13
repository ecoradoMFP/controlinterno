import Link from "next/link";
import { AlertTriangle, CheckCircle2, FolderOpen, Hand, ListChecks } from "lucide-react";
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
import { CARGO_LABELS, ETAPA_ACTIVIDAD_LABELS, type CargoEnum, type EtapaActividadEnum } from "@/types/domain";

type Filtros = { vista?: string; etapa?: string; departamento?: string; tipo?: string; anio?: string; q?: string };

const RUTA = "/actividades";
const ETAPAS: EtapaActividadEnum[] = ["planificacion", "ejecucion", "comunicacion_resultados", "expediente_cierre"];
const SELECT_CLASES =
  "h-8 w-auto max-w-64 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Bandeja de auditorías: por defecto las que están en curso. Las tarjetas KPI son filtros (lo que
 * te toca, en riesgo, en curso, concluidas, todas) y los demás filtros se combinan con ellas. Cada
 * fila dice en qué etapa va, quién la tiene y, si está en riesgo, por qué.
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
    { data: oficiosAbiertos },
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
    supabase
      .from("oficios")
      .select("actividad_id, no_oficio, fecha_emision, fecha_vencimiento")
      .is("fecha_respuesta", null)
      .not("fecha_vencimiento", "is", null),
    supabase.from("parametros_semaforo").select("*"),
    supabase.from("calendario_feriados").select("fecha"),
  ]);

  const hoy = hoyGuatemala();
  const umbral = new Map((parametros ?? []).map((p) => [p.ambito, p as UmbralSemaforo]));
  const semaforo = semaforoConMotivoPorActividad(
    hitosAbiertos ?? [],
    oficiosAbiertos ?? [],
    hoy,
    new Set((feriadosRows ?? []).map((f) => f.fecha)),
    umbral.get("hito") ?? UMBRAL_POR_DEFECTO,
    umbral.get("oficio") ?? UMBRAL_POR_DEFECTO,
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
      totalDocs: docsEtapa.length,
      terminados: docsEtapa.length - abiertos.length,
      abiertos: abiertos.map((d) => d.cargo_actual_responsable),
      meTocan: cargo ? abiertos.filter((d) => d.cargo_actual_responsable === cargo).length : 0,
      enRiesgo: !!sem && (sem.color === "naranja" || sem.color === "rojo"),
    };
  });
  type Fila = (typeof filas)[number];

  const veDepartamentos = usuario?.cargo === "director" || usuario?.cargo === "subdirector";
  const q = sinTildes(filtros.q ?? "").trim();

  type Aplicados = { vista?: string; etapa?: string; departamento?: string; tipo?: string; anio?: string };
  const aplicados: Aplicados = {
    vista: filtros.vista || undefined,
    etapa: filtros.etapa || undefined,
    departamento: veDepartamentos ? filtros.departamento || undefined : undefined,
    tipo: filtros.tipo || undefined,
    anio: filtros.anio || undefined,
  };
  const campoDe = (f: Fila, campo: "etapa" | "departamento" | "tipo" | "anio") =>
    campo === "etapa" ? f.etapa_actual : campo === "departamento" ? f.departamento_id : campo === "tipo" ? f.tipo_auditoria : String(f.anio_cai ?? "");
  const coincide = (f: Fila, omitir?: keyof Aplicados) => {
    if (omitir !== "vista") {
      const v = aplicados.vista ?? "en_curso";
      if (v === "en_curso" && f.concluida) return false;
      if (v === "concluidas" && !f.concluida) return false;
      if (v === "te_toca" && f.meTocan === 0) return false;
      if (v === "riesgo" && !f.enRiesgo) return false;
    }
    for (const campo of ["etapa", "departamento", "tipo", "anio"] as const) {
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
  for (const campo of ["etapa", "departamento", "tipo", "anio"] as const) {
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

  const conteos = (campo: "etapa" | "departamento" | "tipo" | "anio") => {
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
  const cTipo = conteos("tipo");
  const cAnio = conteos("anio");
  const nombreDepartamento = new Map(filas.map((f) => [f.departamento_id, f.departamentos?.nombre ?? ""]));
  const hayFiltros = !!(aplicados.vista || aplicados.etapa || aplicados.departamento || aplicados.tipo || aplicados.anio || q);

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
    icon: typeof ListChecks,
    tone: "accent" | "primary" | "naranja" | "verde",
  ) => (
    // Volver a hacer clic en la tarjeta activa regresa a "En curso".
    <Link
      key={clave}
      href={urlCon({ vista: vista === clave ? "" : clave })}
      aria-pressed={vista === clave}
      className={cn("block h-full rounded-2xl", vista === clave && "ring-2 ring-primary")}
    >
      <StatCard icon={icon} tone={tone} label={label} value={String(valor)} detail={detail} className="h-full" />
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Auditorías (CAI)</h1>
          <p className="text-sm text-muted-foreground">En qué etapa va cada auditoría, quién la tiene y cuáles requieren atención.</p>
        </div>
        {puedeEscribir(usuario) ? <Button render={<Link href="/actividades/nueva" />}>Nueva auditoría</Button> : null}
      </div>

      {error ? <p className="text-sm text-destructive">No se pudieron cargar las auditorías.</p> : null}

      <div className={cn("grid auto-rows-fr grid-cols-2 gap-3", cargo ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
        {cargo
          ? kpi("te_toca", "Te tocan", `Con documentos en ${CARGO_LABELS[cargo]}`, base.filter((f) => f.meTocan > 0).length, Hand, "primary")
          : null}
        {kpi("riesgo", "En riesgo", "Hito u oficio por vencer o vencido", base.filter((f) => f.enRiesgo).length, AlertTriangle, "naranja")}
        {kpi("en_curso", "En curso", "Todavía no se archivan", base.filter((f) => !f.concluida).length, FolderOpen, "accent")}
        {kpi("concluidas", "Concluidas", "Entregadas al archivo", base.filter((f) => f.concluida).length, CheckCircle2, "verde")}
        {kpi("todas", "Todas", "Sin importar el estado", base.length, ListChecks, "accent")}
      </div>

      <div className="rounded-xl border shadow-sm">
        <FiltrosAutomaticos ruta={RUTA} className="flex flex-wrap items-center gap-2 border-b p-4">
          <input type="hidden" name="vista" value={aplicados.vista ?? ""} />
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
          <select key={`tipo-${aplicados.tipo}`} name="tipo" defaultValue={aplicados.tipo ?? ""} className={SELECT_CLASES} aria-label="Tipo de auditoría">
            <option value="">Todos los tipos</option>
            {[...cTipo.keys()].sort().map((t) => (
              <option key={t} value={t} disabled={!cTipo.get(t)}>
                {t} ({cTipo.get(t)})
              </option>
            ))}
          </select>
          <select key={`anio-${aplicados.anio}`} name="anio" defaultValue={aplicados.anio ?? ""} className={SELECT_CLASES} aria-label="Año del CAI">
            <option value="">Todos los años</option>
            {[...cAnio.keys()]
              .sort((x, y) => Number(y) - Number(x))
              .map((a) => (
                <option key={a} value={a} disabled={!cAnio.get(a)}>
                  {a} ({cAnio.get(a)})
                </option>
              ))}
          </select>
          <Input name="q" type="text" defaultValue={filtros.q ?? ""} placeholder="Buscar CAI, nombramiento, dependencia o auditor" className="h-8 min-w-56 flex-1 sm:max-w-xs" />
          {hayFiltros ? (
            <Button variant="ghost" size="sm" className="h-8" nativeButton={false} render={<Link href={RUTA} />}>
              Limpiar filtros
            </Button>
          ) : null}
        </FiltrosAutomaticos>

        {visibles.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {filas.length === 0
              ? "No hay auditorías dentro de tu alcance todavía."
              : vista === "te_toca" && !q
                ? "No tienes documentos pendientes en ninguna auditoría."
                : "Ninguna auditoría coincide con los filtros."}
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
  totalDocs: number;
  terminados: number;
  abiertos: CargoEnum[];
  meTocan: number;
  enRiesgo: boolean;
};

function FilaAuditoria({ fila: f }: { fila: FilaVista }) {
  const indice = ETAPAS.indexOf(f.etapa_actual);
  return (
    <li>
      <Link href={`/actividades/${f.id}`} className="flex flex-col gap-3 p-4 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="codigo-expediente font-semibold">{identificadorAuditoria(f)}</span>
            <span className="font-medium">{f.dependencia_auditada}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {f.tipo_auditoria}
            {f.departamentos?.nombre ? ` · ${f.departamentos.nombre}` : ""}
            {f.auditor_principal?.nombre ? ` · Auditor principal: ${f.auditor_principal.nombre}` : ""}
            {f.cai ? ` · ${f.no_nombramiento}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {/* Las cuatro etapas en miniatura: hechas, la actual y las que faltan. */}
            <span className="flex gap-1" aria-hidden>
              {ETAPAS.map((e, i) => (
                <span
                  key={e}
                  className={cn(
                    "h-1.5 w-6 rounded-full",
                    f.concluida || i < indice ? "bg-primary" : i === indice ? "bg-primary/40" : "bg-muted",
                  )}
                />
              ))}
            </span>
            <span>
              {f.concluida ? "Concluida" : ETAPA_ACTIVIDAD_LABELS[f.etapa_actual]}
              {!f.concluida && f.totalDocs > 0 ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {f.terminados} de {f.totalDocs} documentos
                </span>
              ) : null}
            </span>
            {!f.concluida && f.abiertos.length > 0 ? (
              <span className="text-muted-foreground">· Lo tienen: {porCargo(f.abiertos)}</span>
            ) : null}
          </div>
          {f.enRiesgo && f.sem ? <p className="text-xs text-muted-foreground">{f.sem.motivo}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          {f.meTocan > 0 ? <Badge>Te toca{f.meTocan > 1 ? `: ${f.meTocan} documentos` : ""}</Badge> : null}
          {f.sem ? <SemaforoChip tono={f.sem.color} label={COLOR_SEMAFORO_LABELS[f.sem.color]} /> : null}
          {!f.concluida ? <span className="text-xs text-muted-foreground">Límite de notificación: {f.fecha_notificacion}</span> : null}
        </div>
      </Link>
    </li>
  );
}

/** "3 Auditor, 1 Subjefe", de mayor a menor. */
function porCargo(cargos: CargoEnum[]) {
  const cuenta = new Map<CargoEnum, number>();
  for (const c of cargos) cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
  return [...cuenta]
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${n} ${CARGO_LABELS[c]}`)
    .join(", ");
}

/** Para buscar sin importar mayúsculas ni tildes ("tesoreria" encuentra "Tesorería"). */
function sinTildes(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
