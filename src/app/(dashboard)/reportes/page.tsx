import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { identificadorAuditoria } from "@/lib/auditoria";
import { hoyGuatemala } from "@/lib/recomendaciones";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FiltrosAutomaticos } from "@/components/recomendaciones/filtros-automaticos";
import { BarrasHorizontales, PlanContraReal } from "@/components/reportes/graficas";
import { Pastel, type PorcionPastel } from "@/components/reportes/pastel";
import { COLOR_SEMAFORO_CSS_VAR, SemaforoBadge } from "@/components/semaforo-chip";
import {
  calcularSemaforo,
  COLOR_SEMAFORO_LABELS,
  semaforoConMotivoPorActividad,
  SEVERIDAD,
  UMBRAL_POR_DEFECTO,
  type ColorSemaforo,
  type UmbralSemaforo,
} from "@/lib/semaforo";
import {
  calcularCumplimiento,
  calcularPlanVsReal,
  calcularSegmentosPermanencia,
  formatearHoras,
  promediarPorClave,
  sinCorregidos,
} from "@/lib/bi";
import { construirMapaOrganizacional, responsablesPorCargo } from "@/lib/organizacion";
import { CARGO_LABELS, ETAPA_ACTIVIDAD_LABELS, ETAPA_DOCUMENTO_LABELS, type CargoEnum, type EtapaActividadEnum } from "@/types/domain";

const SELECT_CLASES = "h-9 w-auto max-w-xs rounded-full border border-input bg-card px-3 text-sm";
const ETAPAS: EtapaActividadEnum[] = ["planificacion", "ejecucion", "comunicacion_resultados", "expediente_cierre"];

const COLORES_ETAPA = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
const ORDEN_SEMAFORO: ColorSemaforo[] = ["verde", "amarillo", "naranja", "rojo"];

export default async function ReportesPage({ searchParams }: { searchParams: Promise<{ dep?: string }> }) {
  const { dep } = await searchParams;
  const supabase = await createClient();

  const [
    { data: actividadesTodas },
    { data: hitosAbiertosTodos },
    { data: oficiosAbiertosTodos },
    { data: parametros },
    { data: feriadosRows },
    { data: documentosTodos },
    { data: hitosConcluidosTodos },
    { data: oficiosConcluidosTodos },
    { data: equipos },
    { data: usuariosEquipo },
    { data: departamentos },
    { data: subdirecciones },
  ] = await Promise.all([
    supabase
      .from("actividades")
      .select("id, cai, anio_cai, no_nombramiento, dependencia_auditada, auditor_principal_nit, etapa_actual, concluida, departamento_id, departamentos(nombre)")
      .order("created_at", { ascending: false }),
    supabase.from("hitos_cronograma").select("actividad_id, nombre, fecha_inicio_esperada, fecha_fin_esperada").is("fecha_fin_real", null),
    supabase
      .from("oficios")
      .select("actividad_id, no_oficio, fecha_emision, fecha_vencimiento, responsable_elaboracion_nit")
      .is("fecha_respuesta", null)
      .not("fecha_vencimiento", "is", null),
    supabase.from("parametros_semaforo").select("*"),
    supabase.from("calendario_feriados").select("fecha"),
    supabase
      .from("documentos_actividad")
      .select(
        "id, created_at, fase_actual, cargo_actual_responsable, actividad_id, documentos_catalogo(nombre), movimientos(id, corrige_movimiento_id, de_cargo, a_cargo, timestamp)",
      ),
    supabase
      .from("hitos_cronograma")
      .select("actividad_id, etapa, dias_habiles_esperados, fecha_inicio_esperada, fecha_fin_esperada, fecha_fin_real")
      .eq("estado", "concluido")
      .not("fecha_fin_real", "is", null),
    supabase
      .from("oficios")
      .select("actividad_id, fecha_vencimiento, fecha_respuesta")
      .not("fecha_respuesta", "is", null)
      .not("fecha_vencimiento", "is", null),
    supabase.from("actividades_equipo").select("actividad_id, usuario_nit"),
    supabase
      .from("usuarios")
      .select("nit, nombre, cargo, departamento_id, departamentos(nombre)")
      .in("cargo", ["auditor", "subjefe", "jefe"])
      .eq("activo", true),
    supabase.from("departamentos").select("id, nombre, subdireccion_id").order("nombre"),
    supabase.from("subdirecciones").select("id, subdirector_nit"),
  ]);

  const departamentosConDatos = (departamentos ?? []).filter((d) => (actividadesTodas ?? []).some((a) => a.departamento_id === d.id));
  const depFiltro = dep && departamentosConDatos.some((d) => d.id === dep) ? dep : null;
  const actividades = (actividadesTodas ?? []).filter((a) => !depFiltro || a.departamento_id === depFiltro);
  const actividadPorId = new Map(actividades.map((a) => [a.id, a]));
  const enAlcance = (actividadId: string | null) => (actividadId ? actividadPorId.has(actividadId) : !depFiltro);
  const hitosAbiertos = (hitosAbiertosTodos ?? []).filter((h) => enAlcance(h.actividad_id));
  const oficiosAbiertos = (oficiosAbiertosTodos ?? []).filter((o) => enAlcance(o.actividad_id));
  const documentos = (documentosTodos ?? []).filter((d) => enAlcance(d.actividad_id));
  const hitosConcluidos = (hitosConcluidosTodos ?? []).filter((h) => enAlcance(h.actividad_id));
  const oficiosConcluidos = (oficiosConcluidosTodos ?? []).filter((o) => enAlcance(o.actividad_id));

  const feriados = new Set((feriadosRows ?? []).map((f) => f.fecha));
  const umbralPorAmbito = new Map((parametros ?? []).map((p) => [p.ambito, p as UmbralSemaforo]));
  const umbralHito = umbralPorAmbito.get("hito") ?? UMBRAL_POR_DEFECTO;
  const umbralOficio = umbralPorAmbito.get("oficio") ?? UMBRAL_POR_DEFECTO;
  const hoy = hoyGuatemala();

  const peorPorActividad = semaforoConMotivoPorActividad(
    hitosAbiertos.filter((h) => actividadPorId.get(h.actividad_id)?.concluida === false),
    hoy,
    feriados,
    umbralHito,
  );
  const conteo: Record<ColorSemaforo, number> = { verde: 0, amarillo: 0, naranja: 0, rojo: 0 };
  for (const { color } of peorPorActividad.values()) conteo[color]++;
  const enRiesgo = [...peorPorActividad.entries()]
    .filter(([, p]) => p.color === "rojo" || p.color === "naranja")
    .sort(([, a], [, b]) => SEVERIDAD[b.color] - SEVERIDAD[a.color] || a.fecha.localeCompare(b.fecha));

  const oficiosPorAtender = oficiosAbiertos
    .map((o) => ({ ...o, color: calcularSemaforo(o.fecha_emision, o.fecha_vencimiento!, hoy, feriados, umbralOficio) }))
    .filter((o) => o.color === "rojo" || o.color === "naranja")
    .sort((a, b) => SEVERIDAD[b.color] - SEVERIDAD[a.color] || a.fecha_vencimiento!.localeCompare(b.fecha_vencimiento!));

  const enCurso = actividades.filter((a) => !a.concluida);
  const concluidas = actividades.length - enCurso.length;
  const oficiosVencidos = oficiosAbiertos.filter((o) => o.fecha_vencimiento! < hoy).length;
  const cumplimientoHitos = calcularCumplimiento(hitosConcluidos.map((h) => ({ esperada: h.fecha_fin_esperada, real: h.fecha_fin_real! })));
  const cumplimientoOficios = calcularCumplimiento(oficiosConcluidos.map((o) => ({ esperada: o.fecha_vencimiento!, real: o.fecha_respuesta! })));
  const enRevision = documentos.filter((d) => d.fase_actual === "revision").length;

  const porSemaforo: PorcionPastel[] = ORDEN_SEMAFORO.map((c) => ({
    clave: c,
    etiqueta: COLOR_SEMAFORO_LABELS[c],
    valor: conteo[c],
    color: COLOR_SEMAFORO_CSS_VAR[c],
  }));
  const porEtapa: PorcionPastel[] = ETAPAS.map((e, i) => ({
    clave: e,
    etiqueta: ETAPA_ACTIVIDAD_LABELS[e],
    valor: enCurso.filter((a) => a.etapa_actual === e).length,
    color: COLORES_ETAPA[i],
  }));
  const aTiempoContraTarde = (c: { aTiempo: number; tarde: number }): PorcionPastel[] => [
    { clave: "a_tiempo", etiqueta: "A tiempo", valor: c.aTiempo, color: "var(--status-verde)" },
    { clave: "tarde", etiqueta: "Tarde", valor: c.tarde, color: "var(--status-rojo)" },
  ];

  const planVsReal = calcularPlanVsReal(
    hitosConcluidos.map((h) => ({
      etapa: h.etapa,
      dias_habiles_esperados: h.dias_habiles_esperados,
      fecha_inicio_esperada: h.fecha_inicio_esperada,
      fecha_fin_real: h.fecha_fin_real!,
    })),
    feriados,
  ).map((p) => ({ etapa: ETAPA_DOCUMENTO_LABELS[p.etapa], plan: p.planPromedio, real: p.realPromedio, n: p.n }));

  const departamentoDeActividad = new Map(actividades.map((a) => [a.id, a.departamentos?.nombre ?? null]));
  const segmentos = calcularSegmentosPermanencia(
    documentos.map((d) => ({
      created_at: d.created_at,
      departamentoNombre: departamentoDeActividad.get(d.actividad_id) ?? null,
      documentoNombre: d.documentos_catalogo?.nombre ?? null,
      movimientos: sinCorregidos(d.movimientos),
    })),
    feriados,
  );
  const porCargo = promediarPorClave(segmentos, (s) => s.cargo).map((r) => ({
    clave: r.clave,
    etiqueta: CARGO_LABELS[r.clave as CargoEnum] ?? r.clave,
    valor: r.horasPromedio,
    texto: formatearHoras(r.horasPromedio),
    detalle: `Promedio de ${r.n} paso(s) con ${CARGO_LABELS[r.clave as CargoEnum] ?? r.clave}`,
  }));
  const documentosLentos = promediarPorClave(segmentos, (s) => s.documentoNombre)
    .slice(0, 5)
    .map((r) => ({ clave: r.clave, etiqueta: r.clave, valor: r.horasPromedio, texto: formatearHoras(r.horasPromedio), detalle: `Promedio de ${r.n} paso(s)` }));
  const tiempoPorDepartamento = new Map(promediarPorClave(segmentos, (s) => s.departamentoNombre).map((r) => [r.clave, r.horasPromedio]));

  const mapaOrg = construirMapaOrganizacional(
    (usuariosEquipo ?? []).map((u) => ({ nit: u.nit, cargo: u.cargo, departamento_id: u.departamento_id })),
    departamentos ?? [],
    subdirecciones ?? [],
  );
  const equipoPorActividad = new Map<string, Set<string>>();
  for (const a of actividades) equipoPorActividad.set(a.id, new Set([a.auditor_principal_nit]));
  for (const eq of equipos ?? []) equipoPorActividad.get(eq.actividad_id)?.add(eq.usuario_nit);

  const sumar = (mapa: Map<string, number>, clave: string) => mapa.set(clave, (mapa.get(clave) ?? 0) + 1);
  const auditoriasPorNit = new Map<string, number>();
  for (const a of enCurso) for (const nit of equipoPorActividad.get(a.id) ?? []) sumar(auditoriasPorNit, nit);
  const docsPorNit = new Map<string, number>();
  const docsPorDep = new Map<string, number>();
  for (const d of documentos) {
    if (d.fase_actual === "finalizado") continue;
    const a = actividadPorId.get(d.actividad_id);
    if (!a || a.concluida) continue;
    sumar(docsPorDep, a.departamento_id);
    const nits =
      d.cargo_actual_responsable === "auditor"
        ? [...(equipoPorActividad.get(d.actividad_id) ?? [])]
        : responsablesPorCargo(mapaOrg, d.cargo_actual_responsable, a.departamento_id);
    for (const nit of nits) sumar(docsPorNit, nit);
  }
  const oficiosPorNit = new Map<string, number>();
  const oficiosPorDep = new Map<string, number>();
  for (const o of oficiosAbiertos) {
    sumar(oficiosPorNit, o.responsable_elaboracion_nit);
    const a = o.actividad_id ? actividadPorId.get(o.actividad_id) : null;
    if (a) sumar(oficiosPorDep, a.departamento_id);
  }

  const cargaDepartamento = departamentosConDatos
    .filter((d) => !depFiltro || d.id === depFiltro)
    .map((d) => ({
      id: d.id,
      nombre: d.nombre,
      enCurso: enCurso.filter((a) => a.departamento_id === d.id).length,
      enRiesgo: enRiesgo.filter(([id]) => actividadPorId.get(id)?.departamento_id === d.id).length,
      documentos: docsPorDep.get(d.id) ?? 0,
      oficios: oficiosPorDep.get(d.id) ?? 0,
      tiempo: tiempoPorDepartamento.get(d.nombre) ?? null,
    }));

  const cargaPersonas = (usuariosEquipo ?? [])
    .filter((u) => !depFiltro || u.departamento_id === depFiltro)
    .map((u) => ({
      nit: u.nit,
      nombre: u.nombre,
      cargo: u.cargo!,
      departamento: u.departamentos?.nombre ?? null,
      auditorias: auditoriasPorNit.get(u.nit) ?? 0,
      documentos: docsPorNit.get(u.nit) ?? 0,
      oficios: oficiosPorNit.get(u.nit) ?? 0,
    }))
    .filter((p) => p.auditorias + p.documentos + p.oficios > 0)
    .sort((a, b) => b.documentos + b.oficios - (a.documentos + a.oficios) || b.auditorias - a.auditorias);

  const cargoMasLento = porCargo[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Tablero</h1>
        {departamentosConDatos.length > 1 ? (
          <FiltrosAutomaticos ruta="/reportes" className="flex items-center gap-2">
            <label htmlFor="dep" className="text-sm text-muted-foreground">
              Departamento
            </label>
            <select id="dep" name="dep" defaultValue={depFiltro ?? ""} className={SELECT_CLASES}>
              <option value="">Todos</option>
              {departamentosConDatos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </FiltrosAutomaticos>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard destacada label="Auditorías en curso" value={enCurso.length} detail={`Concluidas: ${concluidas}`} />
        <StatCard tone="rojo" label="En riesgo" value={enRiesgo.length} detail={`de ${peorPorActividad.size} con plazos abiertos`} />
        <StatCard tone="naranja" label="Oficios vencidos" value={oficiosVencidos} detail={`${oficiosAbiertos.length} sin respuesta`} />
        <StatCard
          tone="verde"
          label="Cronograma a tiempo"
          value={cumplimientoHitos.pct === null ? "—" : `${Math.round(cumplimientoHitos.pct)}%`}
          detail={`${cumplimientoHitos.aTiempo} de ${cumplimientoHitos.aTiempo + cumplimientoHitos.tarde} concluidas`}
        />
        <StatCard
          label="Documentos en revisión"
          value={enRevision}
          detail={cargoMasLento ? `Más demora: ${cargoMasLento.etiqueta}` : undefined}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Panel titulo="Semáforo de auditorías en curso">
          <Pastel porciones={porSemaforo} centro="auditorías" vacio="No hay auditorías con plazos abiertos." />
        </Panel>
        <Panel titulo="Auditorías en curso por etapa">
          <Pastel porciones={porEtapa} centro="en curso" vacio="No hay auditorías en curso." />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel titulo={`Auditorías que requieren atención (${enRiesgo.length})`}>
          {enRiesgo.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguna.</p>
          ) : (
            <ul className="divide-y">
              {enRiesgo.map(([id, p]) => {
                const a = actividadPorId.get(id)!;
                return (
                  <li key={id} className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <Link href={`/actividades/${id}`} className="codigo-expediente font-medium text-primary hover:underline">
                        {identificadorAuditoria(a)}
                      </Link>
                      <span className="text-sm text-muted-foreground"> · {a.dependencia_auditada}</span>
                      <p className="text-sm">{p.motivo}</p>
                    </div>
                    <div className="shrink-0">
                      <SemaforoBadge color={p.color} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel titulo={`Oficios por vencer o vencidos (${oficiosPorAtender.length})`}>
          {oficiosPorAtender.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguno.</p>
          ) : (
            <ul className="divide-y">
              {oficiosPorAtender.map((o) => {
                const a = o.actividad_id ? actividadPorId.get(o.actividad_id) : undefined;
                return (
                  <li key={o.no_oficio} className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <span className="codigo-expediente font-medium">Oficio {o.no_oficio}</span>
                      {a ? (
                        <span className="text-sm text-muted-foreground">
                          {" · "}
                          <Link href={`/actividades/${a.id}`} className="text-primary hover:underline">
                            {identificadorAuditoria(a)}
                          </Link>
                        </span>
                      ) : null}
                      <p className="text-sm">
                        {o.fecha_vencimiento! < hoy ? "Venció" : "Vence"} el {fecha(o.fecha_vencimiento!)}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <SemaforoBadge color={o.color} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Panel titulo="Cronograma cerrado a tiempo">
          <Pastel porciones={aTiempoContraTarde(cumplimientoHitos)} centro="cerradas" vacio="Todavía no hay actividades cerradas." />
        </Panel>
        <Panel titulo="Oficios respondidos a tiempo">
          <Pastel porciones={aTiempoContraTarde(cumplimientoOficios)} centro="respondidos" vacio="Todavía no hay oficios respondidos." />
        </Panel>
      </section>

      <Panel titulo="Días hábiles planeados y reales por etapa">
        <PlanContraReal filas={planVsReal} />
      </Panel>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Tiempo promedio con cada cargo" nota="Horas hábiles: de 8:00 a 16:30, de lunes a viernes, sin asuetos.">
          <BarrasHorizontales filas={porCargo} resaltar vacio="Sin datos todavía." />
        </Panel>
        <Panel titulo="Documentos que más tardan" nota="Tiempo promedio por paso, en horas hábiles.">
          <BarrasHorizontales filas={documentosLentos} resaltar vacio="Sin datos todavía." />
        </Panel>
      </section>

      <section className="tarjeta">
        <h2 className="border-b px-5 py-4 font-semibold">Carga por departamento</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Departamento</TableHead>
              <TableHead className="text-right">En curso</TableHead>
              <TableHead className="text-right">En riesgo</TableHead>
              <TableHead className="text-right">Documentos pendientes</TableHead>
              <TableHead className="text-right">Oficios sin respuesta</TableHead>
              <TableHead className="text-right">Tiempo por paso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargaDepartamento.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Sin auditorías registradas.
                </TableCell>
              </TableRow>
            ) : (
              cargaDepartamento.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium whitespace-normal">{d.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.enCurso}</TableCell>
                  <TableCell className={d.enRiesgo > 0 ? "text-right font-semibold text-[var(--status-rojo)] tabular-nums" : "text-right tabular-nums"}>
                    {d.enRiesgo}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{d.documentos}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.oficios}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.tiempo === null ? "—" : formatearHoras(d.tiempo)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <details className="tarjeta">
        <summary className="cursor-pointer px-5 py-4 font-semibold">Carga por persona ({cargaPersonas.length})</summary>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Persona</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead className="text-right">Auditorías</TableHead>
              <TableHead className="text-right">Documentos</TableHead>
              <TableHead className="text-right">Oficios</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargaPersonas.map((p) => (
              <TableRow key={p.nit}>
                <TableCell className="font-medium whitespace-normal">{p.nombre}</TableCell>
                <TableCell>{CARGO_LABELS[p.cargo]}</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{p.departamento ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{p.auditorias}</TableCell>
                <TableCell className="text-right tabular-nums">{p.documentos}</TableCell>
                <TableCell className="text-right tabular-nums">{p.oficios}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </div>
  );
}

const fecha = (iso: string) => iso.split("-").reverse().join("/");

function Panel({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4 tarjeta p-5">
      <h2 className="font-semibold">{titulo}</h2>
      {children}
      {nota ? <p className="text-xs text-muted-foreground">{nota}</p> : null}
    </section>
  );
}
