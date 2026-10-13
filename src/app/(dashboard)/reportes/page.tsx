import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, FileClock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { identificadorAuditoria } from "@/lib/auditoria";
import { hoyGuatemala } from "@/lib/recomendaciones";
import { SemaforoBadge } from "@/components/semaforo-chip";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FiltrosAutomaticos } from "@/components/recomendaciones/filtros-automaticos";
import { BarraSemaforo, BarrasHorizontales, Medidor, PlanContraReal } from "@/components/reportes/graficas";
import {
  calcularSemaforo,
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

const SELECT_CLASES = "h-9 rounded-lg border border-input bg-background px-3 text-sm";
const ETAPAS: EtapaActividadEnum[] = ["planificacion", "ejecucion", "comunicacion_resultados", "expediente_cierre"];
const SEVERIDAD: Record<ColorSemaforo, number> = { verde: 0, amarillo: 1, naranja: 2, rojo: 3 };

/**
 * Tablero de Reportes. Responde, en este orden, lo que Dirección y jefaturas preguntan: ¿cómo
 * vamos? (indicadores), ¿qué hay que atender? (auditorías en riesgo con su motivo), ¿cumplimos los
 * plazos?, ¿dónde se detiene el trabajo? y ¿cómo está repartida la carga? RLS ya limita todo al
 * alcance de quien consulta; el filtro de departamento solo acota dentro de ese alcance.
 */
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
    // Cuellos de botella y carga: se reconstruyen desde la bitácora (movimientos), la única fuente
    // confiable de "quién tuvo esto y cuánto tiempo".
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

  // ── Alcance: departamento elegido (si lo hay) ──
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

  // ── Semáforo por auditoría, con el motivo (el hito u oficio que la pone en ese color) ──
  const peorPorActividad = new Map<string, { color: ColorSemaforo; motivo: string; fecha: string }>();
  const considerar = (actividadId: string | null, color: ColorSemaforo, motivo: string, fecha: string) => {
    if (!actividadId || !actividadPorId.has(actividadId)) return;
    const actual = peorPorActividad.get(actividadId);
    if (!actual || SEVERIDAD[color] > SEVERIDAD[actual.color] || (color === actual.color && fecha < actual.fecha)) {
      peorPorActividad.set(actividadId, { color, motivo, fecha });
    }
  };
  for (const h of hitosAbiertos) {
    const color = calcularSemaforo(h.fecha_inicio_esperada, h.fecha_fin_esperada, hoy, feriados, umbralHito);
    considerar(h.actividad_id, color, `Hito "${h.nombre}" ${h.fecha_fin_esperada < hoy ? "venció" : "vence"} el ${h.fecha_fin_esperada}`, h.fecha_fin_esperada);
  }
  for (const o of oficiosAbiertos) {
    const color = calcularSemaforo(o.fecha_emision, o.fecha_vencimiento!, hoy, feriados, umbralOficio);
    considerar(o.actividad_id, color, `Oficio ${o.no_oficio} sin respuesta; ${o.fecha_vencimiento! < hoy ? "venció" : "vence"} el ${o.fecha_vencimiento}`, o.fecha_vencimiento!);
  }
  const conteo: Record<ColorSemaforo, number> = { verde: 0, amarillo: 0, naranja: 0, rojo: 0 };
  for (const { color } of peorPorActividad.values()) conteo[color]++;
  const enRiesgo = [...peorPorActividad.entries()]
    .filter(([, p]) => p.color === "rojo" || p.color === "naranja")
    .sort(([, a], [, b]) => SEVERIDAD[b.color] - SEVERIDAD[a.color] || a.fecha.localeCompare(b.fecha));

  // ── Indicadores ──
  const enCurso = actividades.filter((a) => !a.concluida);
  const concluidas = actividades.length - enCurso.length;
  const oficiosVencidos = oficiosAbiertos.filter((o) => o.fecha_vencimiento! < hoy).length;
  const cumplimientoHitos = calcularCumplimiento(hitosConcluidos.map((h) => ({ esperada: h.fecha_fin_esperada, real: h.fecha_fin_real! })));
  const cumplimientoOficios = calcularCumplimiento(oficiosConcluidos.map((o) => ({ esperada: o.fecha_vencimiento!, real: o.fecha_respuesta! })));
  const enRevision = documentos.filter((d) => d.fase_actual === "revision").length;

  // ── Por etapa ──
  const porEtapa = ETAPAS.map((e) => ({
    clave: e,
    etiqueta: ETAPA_ACTIVIDAD_LABELS[e],
    valor: enCurso.filter((a) => a.etapa_actual === e).length,
  })).map((f) => ({ ...f, texto: String(f.valor) }));

  // ── Plazos: plan contra real por etapa ──
  const planVsReal = calcularPlanVsReal(
    hitosConcluidos.map((h) => ({
      etapa: h.etapa,
      dias_habiles_esperados: h.dias_habiles_esperados,
      fecha_inicio_esperada: h.fecha_inicio_esperada,
      fecha_fin_real: h.fecha_fin_real!,
    })),
    feriados,
  ).map((p) => ({ etapa: ETAPA_DOCUMENTO_LABELS[p.etapa], plan: p.planPromedio, real: p.realPromedio, n: p.n }));

  // ── Cuellos de botella: cuánto tiempo pasa un documento con cada cargo antes de avanzar ──
  const departamentoDeActividad = new Map(actividades.map((a) => [a.id, a.departamentos?.nombre ?? null]));
  const segmentos = calcularSegmentosPermanencia(
    documentos.map((d) => ({
      created_at: d.created_at,
      departamentoNombre: departamentoDeActividad.get(d.actividad_id) ?? null,
      documentoNombre: d.documentos_catalogo?.nombre ?? null,
      movimientos: sinCorregidos(d.movimientos),
    })),
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

  // ── Carga: por departamento y por persona ──
  // Un documento pendiente se atribuye a quien responde por su cargo: al equipo de la auditoría si
  // está con el Auditor, o a la jefatura del departamento si está con un cargo de jefatura.
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Reportes</h1>
          <p className="text-sm text-muted-foreground">Cómo van las auditorías, qué requiere atención y dónde se detiene el trabajo.</p>
        </div>
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

      {/* ── Indicadores ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={ClipboardList} label="Auditorías en curso" value={enCurso.length} detail={`${concluidas} concluida(s)`} />
        <StatCard
          icon={AlertTriangle}
          tone="rojo"
          label="En riesgo"
          value={enRiesgo.length}
          detail={`de ${peorPorActividad.size} con plazos abiertos`}
        />
        <StatCard icon={Mail} tone="naranja" label="Oficios vencidos" value={oficiosVencidos} detail={`${oficiosAbiertos.length} esperando respuesta`} />
        <StatCard
          icon={CheckCircle2}
          tone="verde"
          label="Hitos a tiempo"
          value={cumplimientoHitos.pct === null ? "—" : `${Math.round(cumplimientoHitos.pct)}%`}
          detail={`${cumplimientoHitos.aTiempo} de ${cumplimientoHitos.aTiempo + cumplimientoHitos.tarde} concluidos`}
        />
        <StatCard
          icon={FileClock}
          label="Documentos en revisión"
          value={enRevision}
          detail={cargoMasLento ? `Más tiempo con: ${cargoMasLento.etiqueta}` : "Sin historial todavía"}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* ── ¿Cómo van? ── */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-5 min-w-0 rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div>
            <h2 className="font-semibold">Semáforo de auditorías</h2>
            <p className="text-sm text-muted-foreground">Cada auditoría toma el color de su hito u oficio más atrasado.</p>
          </div>
          <BarraSemaforo conteo={conteo} />
          <div className="flex flex-col gap-2 border-t pt-4">
            <h3 className="text-sm font-semibold">Requieren atención ({enRiesgo.length})</h3>
            {enRiesgo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguna auditoría en riesgo moderado o grave.</p>
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
                      <div className="shrink-0 sm:pt-0.5">
                        <SemaforoBadge color={p.color} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 min-w-0 rounded-2xl border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-semibold">Auditorías en curso por etapa</h2>
            <p className="text-sm text-muted-foreground">{enCurso.length} en total.</p>
          </div>
          <BarrasHorizontales filas={porEtapa} vacio="No hay auditorías en curso." />
        </div>
      </section>

      {/* ── ¿Cumplimos los plazos? ── */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-5 min-w-0 rounded-2xl border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-semibold">Cumplimiento de plazos</h2>
            <p className="text-sm text-muted-foreground">De lo ya cerrado, cuánto se cerró a tiempo.</p>
          </div>
          <Medidor titulo="Hitos del cronograma" aTiempo={cumplimientoHitos.aTiempo} tarde={cumplimientoHitos.tarde} />
          <Medidor titulo="Oficios respondidos" aTiempo={cumplimientoOficios.aTiempo} tarde={cumplimientoOficios.tarde} />
        </div>
        <div className="flex flex-col gap-4 min-w-0 rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div>
            <h2 className="font-semibold">Planeado contra real, por etapa</h2>
            <p className="text-sm text-muted-foreground">Días hábiles promedio de las etapas ya concluidas.</p>
          </div>
          <PlanContraReal filas={planVsReal} />
        </div>
      </section>

      {/* ── ¿Dónde se detiene el trabajo? ── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4 min-w-0 rounded-2xl border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-semibold">¿Con quién se detienen los documentos?</h2>
            <p className="text-sm text-muted-foreground">
              {cargoMasLento
                ? `En promedio, un documento pasa ${cargoMasLento.texto} con el ${cargoMasLento.etiqueta} antes de avanzar.`
                : "Tiempo promedio que un documento pasa con cada cargo antes de avanzar."}
            </p>
          </div>
          <BarrasHorizontales filas={porCargo} resaltar vacio="Todavía no hay documentos que hayan cambiado de manos." />
        </div>
        <div className="flex flex-col gap-4 min-w-0 rounded-2xl border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-semibold">Documentos que más tardan</h2>
            <p className="text-sm text-muted-foreground">Tiempo promedio en cada paso de la revisión.</p>
          </div>
          <BarrasHorizontales filas={documentosLentos} resaltar vacio="Todavía no hay documentos que hayan cambiado de manos." />
        </div>
      </section>

      {/* ── Carga ── */}
      <section className="flex flex-col gap-4">
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="font-semibold">Carga por departamento</h2>
            <p className="text-sm text-muted-foreground">Lo que tiene abierto cada departamento hoy.</p>
          </div>
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
                    No hay auditorías dentro de tu alcance todavía.
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
        </div>

        <details className="rounded-2xl border bg-card shadow-sm">
          <summary className="cursor-pointer p-5 font-semibold">
            Carga por persona ({cargaPersonas.length} con trabajo asignado)
            <span className="block text-sm font-normal text-muted-foreground">
              Solo quienes tienen auditorías, documentos u oficios abiertos; los que más pendientes tienen, primero.
            </span>
          </summary>
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
      </section>
    </div>
  );
}
