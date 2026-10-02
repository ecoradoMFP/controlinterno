import Link from "next/link";
import { AlarmClock, CheckCircle2, ClipboardCheck, ClipboardList, Hourglass, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { FiltrosAutomaticos } from "@/components/recomendaciones/filtros-automaticos";
import { ListaRecomendaciones } from "@/components/recomendaciones/lista-recomendaciones";
import { cargarFlujoPorCai, cargarRecomendaciones } from "@/lib/recomendaciones-datos";
import { ESTADO_RECOMENDACION_LABELS, ESTADOS_RECOMENDACION } from "@/types/domain";
import { cn } from "@/lib/utils";

export type FiltrosVista = {
  etapa?: string;
  estado?: string;
  dependencia?: string;
  departamento?: string;
  anio?: string;
  q?: string;
};

const SELECT_CLASES =
  "h-8 w-auto max-w-64 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const RUTA = "/recomendaciones";

/**
 * Bandeja única: recomendaciones agrupadas por CAI. Por defecto muestra las que requieren
 * seguimiento ahora; las tarjetas KPI (por etapa) son filtros, y "Todas" muestra el historial
 * completo. Los demás filtros se combinan con la etapa.
 */
export async function VistaRecomendaciones({ filtros }: { filtros: FiltrosVista }) {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  const todas = await cargarRecomendaciones(supabase);
  const flujo = await cargarFlujoPorCai(supabase, todas);

  const ruta = RUTA;
  const q = (filtros.q ?? "").trim().toLowerCase();
  const etapaPedida = filtros.etapa ?? "";

  // Los indicadores por departamento son de la Dirección (director y subdirector); de jefatura
  // hacia abajo cada quien ve solo su departamento (RLS ya lo limita), así que no se ofrece.
  const veDepartamentos = usuario?.cargo === "director" || usuario?.cargo === "subdirector";

  const alcance = todas;

  type Aplicados = { estado?: string; dependencia?: string; departamento?: string; anio?: string; etapa?: string };
  // ¿La fila cumple todos los filtros, salvo el que se omite? Sirve para dos cosas: las opciones de
  // cada lista (solo valores que dejan resultados con los demás filtros) y los KPI.
  const coincide = (f: (typeof todas)[number], a: Aplicados, omitir?: keyof Aplicados) => {
    if (omitir !== "estado" && a.estado && f.estado_actual !== a.estado) return false;
    if (omitir !== "dependencia" && a.dependencia && f.informe.dependencia_auditada !== a.dependencia) return false;
    if (omitir !== "departamento" && a.departamento && f.informe.departamento_id !== a.departamento) return false;
    if (omitir !== "anio" && a.anio && String(f.anio) !== a.anio) return false;
    if (omitir !== "etapa") {
      // Sin etapa elegida se muestra lo que requiere seguimiento; "todas" quita ese recorte.
      const e = a.etapa ?? "accion";
      if (e === "accion") {
        if (f.etapa !== "por_evaluar" && f.etapa !== "evaluada") return false;
      } else if (e === "vencidas") {
        if (!f.vencida) return false;
      } else if (e !== "todas" && f.etapa !== e) return false;
    }
    if (q) {
      const texto = [f.informe.cai, f.informe.no_nombramiento, f.informe.dependencia_auditada, f.deficiencia.titulo, f.texto]
        .join(" ")
        .toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  };
  const valoresDe = (campo: "estado" | "dependencia" | "departamento" | "anio", a: Aplicados) =>
    new Set(
      alcance
        .filter((f) => coincide(f, a, campo))
        .map((f) =>
          campo === "estado"
            ? f.estado_actual
            : campo === "dependencia"
              ? f.informe.dependencia_auditada
              : campo === "departamento"
                ? f.informe.departamento_id
                : String(f.anio),
        ),
    );

  // Un filtro que ya no deja resultados al combinarse con los demás (por haber cambiado otro) se
  // descarta: nunca se consulta una combinación vacía.
  const aplicados: Aplicados = {
    estado: filtros.estado || undefined,
    dependencia: filtros.dependencia || undefined,
    departamento: veDepartamentos ? filtros.departamento || undefined : undefined,
    anio: filtros.anio || undefined,
    etapa: etapaPedida || undefined,
  };
  for (const campo of ["estado", "dependencia", "departamento", "anio"] as const) {
    const actual = aplicados[campo];
    if (actual && !valoresDe(campo, aplicados).has(actual)) aplicados[campo] = undefined;
  }
  const etapa = aplicados.etapa ?? "accion";

  // KPI: todo menos la etapa, para que cuadren con lo que muestra la lista.
  const base = alcance.filter((f) => coincide(f, aplicados, "etapa"));

  const cuenta = (e: string) => base.filter((f) => f.etapa === e).length;

  const visibles = alcance
    .filter((f) => coincide(f, aplicados))
    // Vencidas primero, luego por fecha de implementación más próxima; agrupar por CAI conserva
    // el orden de la primera fila de cada CAI.
    .sort(
      (a, b) =>
        Number(b.vencida) - Number(a.vencida) ||
        (a.fecha_implementacion ?? "9999").localeCompare(b.fecha_implementacion ?? "9999"),
    );

  const urlCon = (cambios: FiltrosVista) => {
    const params = new URLSearchParams(
      Object.entries({
        estado: aplicados.estado,
        dependencia: aplicados.dependencia,
        departamento: aplicados.departamento,
        anio: aplicados.anio,
        q: filtros.q,
        etapa: aplicados.etapa,
        ...cambios,
      }).filter((e): e is [string, string] => !!e[1]),
    );
    const qs = params.toString();
    return `${ruta}${qs ? `?${qs}` : ""}`;
  };

  const kpi = (clave: string, label: string, detail: string, valor: number, icon: typeof ClipboardList, tone: "amarillo" | "naranja" | "accent" | "verde") => {
    // Volver a hacer clic en la tarjeta activa regresa a lo que requiere seguimiento.
    const href = urlCon({ etapa: etapa === clave ? "" : clave });
    return (
      <Link key={clave} href={href} aria-pressed={etapa === clave} className={cn("block h-full rounded-2xl", etapa === clave && "ring-2 ring-primary")}>
        <StatCard icon={icon} tone={tone} label={label} value={String(valor)} detail={detail} className="h-full" />
      </Link>
    );
  };

  // Los filtros siempre están visibles y con todas sus opciones: nada aparece ni desaparece al
  // elegir otro. Lo que no dejaría resultados con los demás filtros queda deshabilitado ("0"), así
  // no se puede elegir una combinación vacía y tampoco hay que quitar un filtro para cambiar otro.
  const conteos = (campo: "estado" | "dependencia" | "departamento" | "anio") => {
    const mapa = new Map<string, number>();
    for (const f of alcance) {
      const clave =
        campo === "estado"
          ? f.estado_actual
          : campo === "dependencia"
            ? f.informe.dependencia_auditada
            : campo === "departamento"
              ? f.informe.departamento_id
              : String(f.anio);
      mapa.set(clave, (mapa.get(clave) ?? 0) + (coincide(f, aplicados, campo) ? 1 : 0));
    }
    return mapa;
  };
  const cEstado = conteos("estado");
  const cDependencia = conteos("dependencia");
  const cDepartamento = conteos("departamento");
  const cAnio = conteos("anio");
  const estados = ESTADOS_RECOMENDACION.filter((e) => cEstado.has(e));
  const dependencias = [...cDependencia.keys()].sort();
  const nombreDepartamento = new Map(alcance.map((f) => [f.informe.departamento_id, f.informe.departamentos?.nombre ?? ""]));
  const departamentos = [...cDepartamento.keys()].sort((x, y) => (nombreDepartamento.get(x) ?? "").localeCompare(nombreDepartamento.get(y) ?? ""));
  const anios = [...cAnio.keys()].sort((x, y) => Number(y) - Number(x));
  const hayFiltros = !!(aplicados.estado || aplicados.dependencia || aplicados.departamento || aplicados.anio || aplicados.etapa || q);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Seguimiento a recomendaciones</h1>
          <p className="text-sm text-muted-foreground">
            Cada recomendación se sigue, informe tras informe, hasta que queda cumplida. Se agrupan por CAI.
          </p>
        </div>
        {puedeEscribir(usuario) ? <Button render={<Link href="/recomendaciones/informes/nuevo" />}>Nuevo CAI</Button> : null}
      </div>

      <div className="grid auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-6">
        {kpi("por_evaluar", "Por evaluar", "Falta registrar su seguimiento", cuenta("por_evaluar"), ClipboardList, "naranja")}
        {kpi("evaluada", "Evaluadas", "Falta emitir el informe", cuenta("evaluada"), ClipboardCheck, "amarillo")}
        {kpi("vencidas", "Vencidas", "Plazo pasado", base.filter((f) => f.vencida).length, AlarmClock, "naranja")}
        {kpi("en_seguimiento", "En seguimiento", "Evaluadas este año", cuenta("en_seguimiento"), Hourglass, "accent")}
        {kpi("atendida", "Atendidas", "Cumplidas, histórico", cuenta("atendida"), CheckCircle2, "verde")}
        {kpi("todas", "Todas", "Sin filtro de etapa", base.length, ListChecks, "accent")}
      </div>

      <div className="rounded-xl border shadow-sm">
        <FiltrosAutomaticos ruta={ruta} className="flex flex-wrap items-center gap-2 border-b p-4">
          <input type="hidden" name="etapa" value={aplicados.etapa ?? ""} />
          <select key={`estado-${aplicados.estado}`} name="estado" defaultValue={aplicados.estado ?? ""} className={SELECT_CLASES} aria-label="Estado">
            <option value="">Todos los estados</option>
            {estados.map((e) => (
              <option key={e} value={e} disabled={!cEstado.get(e)}>
                {ESTADO_RECOMENDACION_LABELS[e]} ({cEstado.get(e)})
              </option>
            ))}
          </select>
          <select key={`dependencia-${aplicados.dependencia}`} name="dependencia" defaultValue={aplicados.dependencia ?? ""} className={SELECT_CLASES} aria-label="Dependencia">
            <option value="">Todas las dependencias</option>
            {dependencias.map((d) => (
              <option key={d} value={d} disabled={!cDependencia.get(d)}>
                {d} ({cDependencia.get(d)})
              </option>
            ))}
          </select>
          {veDepartamentos ? (
            <select key={`departamento-${aplicados.departamento}`} name="departamento" defaultValue={aplicados.departamento ?? ""} className={SELECT_CLASES} aria-label="Departamento">
              <option value="">Todos los departamentos</option>
              {departamentos.map((id) => (
                <option key={id} value={id} disabled={!cDepartamento.get(id)}>
                  {nombreDepartamento.get(id)} ({cDepartamento.get(id)})
                </option>
              ))}
            </select>
          ) : null}
          <select key={`anio-${aplicados.anio}`} name="anio" defaultValue={aplicados.anio ?? ""} className={SELECT_CLASES} aria-label="Año">
            <option value="">Todos los años</option>
            {anios.map((a) => (
              <option key={a} value={a} disabled={!cAnio.get(a)}>
                {a} ({cAnio.get(a)})
              </option>
            ))}
          </select>
          <Input name="q" type="text" defaultValue={filtros.q ?? ""} placeholder="Buscar CAI, nombramiento o texto" className="h-8 min-w-56 flex-1 sm:max-w-xs" />
          {hayFiltros ? (
            <Button variant="ghost" size="sm" className="h-8" nativeButton={false} render={<Link href={ruta} />}>
              Limpiar filtros
            </Button>
          ) : null}
        </FiltrosAutomaticos>

        {visibles.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {etapa === "accion" && !hayFiltros
              ? "No hay recomendaciones que requieran seguimiento ahora."
              : "Ninguna recomendación coincide con los filtros."}
          </p>
        ) : (
          <ListaRecomendaciones filas={visibles} contexto="auto" flujo={flujo} />
        )}
      </div>
    </div>
  );
}
