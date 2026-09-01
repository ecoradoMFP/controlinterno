import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calcularColorPorActividad,
  UMBRAL_POR_DEFECTO,
  COLOR_SEMAFORO_CLASSES,
  COLOR_SEMAFORO_LABELS,
  type ColorSemaforo,
  type UmbralSemaforo,
} from "@/lib/semaforo";
import {
  calcularCumplimiento,
  calcularPlanVsReal,
  calcularSegmentosPermanencia,
  promediarPorClave,
} from "@/lib/bi";
import { RankingTable } from "@/components/reportes/ranking-table";
import { CargaTrabajoTable, type FilaCargaTrabajo } from "@/components/reportes/carga-trabajo-table";
import { CumplimientoCards } from "@/components/reportes/cumplimiento-cards";
import { PlanVsRealChart } from "@/components/reportes/plan-vs-real-chart";
import { CARGO_LABELS, type CargoEnum } from "@/types/domain";

const COLORES: ColorSemaforo[] = ["verde", "amarillo", "naranja", "rojo"];

export default async function ReportesPage() {
  const supabase = await createClient();

  // Sin filtro explícito en ninguna de las 3 consultas: RLS (actividades_select, hitos_select,
  // oficios_select) ya devuelve solo lo que está dentro del alcance del usuario actual, igual
  // que en /documentos.
  const [
    { data: actividades },
    { data: hitosAbiertos },
    { data: oficiosAbiertos },
    { data: parametros },
    { data: feriadosRows },
    { data: documentosConMovimientos },
    { data: hitosConcluidos },
    { data: oficiosConcluidos },
    { data: equipos },
    { data: usuariosAuditores },
  ] = await Promise.all([
    supabase
      .from("actividades")
      .select(
        "id, no_nombramiento, dependencia_auditada, auditor_principal_nit, etapa_actual, departamentos(nombre)",
      )
      .order("no_nombramiento"),
    supabase
      .from("hitos_cronograma")
      .select("actividad_id, fecha_inicio_esperada, fecha_fin_esperada")
      .is("fecha_fin_real", null),
    supabase
      .from("oficios")
      .select("actividad_id, fecha_emision, fecha_vencimiento, responsable_elaboracion_nit")
      .is("fecha_respuesta", null)
      .not("fecha_vencimiento", "is", null)
      .not("actividad_id", "is", null),
    supabase.from("parametros_semaforo").select("*"),
    supabase.from("calendario_feriados").select("fecha"),
    // Sección 7: cuellos de botella / carga de trabajo — reconstruidos a partir de la bitácora
    // (movimientos), no de columnas agregadas: es la única fuente confiable de "quién tuvo esto
    // y cuánto tiempo" (sección 4.8).
    supabase
      .from("documentos_actividad")
      .select(
        "id, created_at, fase_actual, cargo_actual_responsable, actividad_id, actividades(departamentos(nombre)), documentos_catalogo(nombre), movimientos(de_cargo, a_cargo, timestamp)",
      ),
    supabase
      .from("hitos_cronograma")
      .select("etapa, dias_habiles_esperados, fecha_inicio_esperada, fecha_fin_esperada, fecha_fin_real")
      .eq("estado", "concluido")
      .not("fecha_fin_real", "is", null),
    supabase
      .from("oficios")
      .select("fecha_vencimiento, fecha_respuesta")
      .not("fecha_respuesta", "is", null)
      .not("fecha_vencimiento", "is", null),
    supabase.from("actividades_equipo").select("actividad_id, usuario_nit"),
    supabase
      .from("usuarios")
      .select("nit, nombre, departamento_id, departamentos(nombre)")
      .eq("cargo", "auditor")
      .eq("activo", true),
  ]);

  const feriados = new Set((feriadosRows ?? []).map((f) => f.fecha));
  const umbralPorAmbito = new Map((parametros ?? []).map((p) => [p.ambito, p as UmbralSemaforo]));
  const umbralHito = umbralPorAmbito.get("hito") ?? UMBRAL_POR_DEFECTO;
  const umbralOficio = umbralPorAmbito.get("oficio") ?? UMBRAL_POR_DEFECTO;
  const hoy = new Date().toISOString().slice(0, 10);

  const colorPorActividad = calcularColorPorActividad(
    hitosAbiertos ?? [],
    oficiosAbiertos ?? [],
    hoy,
    feriados,
    umbralHito,
    umbralOficio,
  );

  const conteo: Record<ColorSemaforo, number> = { verde: 0, amarillo: 0, naranja: 0, rojo: 0 };
  for (const color of colorPorActividad.values()) conteo[color]++;
  const totalConDato = colorPorActividad.size;

  // Cuellos de botella: tramos de permanencia por cargo, reconstruidos desde la bitácora.
  const segmentos = calcularSegmentosPermanencia(
    (documentosConMovimientos ?? []).map((d) => ({
      created_at: d.created_at,
      departamentoNombre: d.actividades?.departamentos?.nombre ?? null,
      documentoNombre: d.documentos_catalogo?.nombre ?? null,
      movimientos: d.movimientos,
    })),
    feriados,
  );
  const rankingPorCargo = promediarPorClave(segmentos, (s) => s.cargo);
  const rankingPorDepartamento = promediarPorClave(segmentos, (s) => s.departamentoNombre);
  const rankingPorDocumento = promediarPorClave(segmentos, (s) => s.documentoNombre);

  // Carga de trabajo por auditor: actividades activas por equipo/auditor principal, más
  // documentos pendientes en la etapa del Auditor y oficios propios sin respuesta.
  const actividadPorId = new Map((actividades ?? []).map((a) => [a.id, a]));
  const actividadesActivasPorNit = new Map<string, Set<string>>();
  function agregarActividadActiva(nit: string | null, actividadId: string) {
    const actividad = actividadPorId.get(actividadId);
    if (!nit || !actividad || actividad.etapa_actual === "expediente_cierre") return;
    const set = actividadesActivasPorNit.get(nit) ?? new Set<string>();
    set.add(actividadId);
    actividadesActivasPorNit.set(nit, set);
  }
  for (const a of actividades ?? []) agregarActividadActiva(a.auditor_principal_nit, a.id);
  for (const eq of equipos ?? []) agregarActividadActiva(eq.usuario_nit, eq.actividad_id);

  // Un documento pendiente en la etapa del Auditor se atribuye a todo el equipo de esa
  // actividad (cargo_actual_responsable es un rol, no una persona; con más de un auditor en el
  // equipo no hay forma de saber cuál de ellos lo tiene sin un dato adicional).
  const equipoPorActividad = new Map<string, Set<string>>();
  for (const eq of equipos ?? []) {
    const set = equipoPorActividad.get(eq.actividad_id) ?? new Set<string>();
    set.add(eq.usuario_nit);
    equipoPorActividad.set(eq.actividad_id, set);
  }
  for (const a of actividades ?? []) {
    const set = equipoPorActividad.get(a.id) ?? new Set<string>();
    set.add(a.auditor_principal_nit);
    equipoPorActividad.set(a.id, set);
  }
  const documentosPendientesPorNit = new Map<string, number>();
  for (const d of documentosConMovimientos ?? []) {
    if (d.fase_actual === "finalizado" || d.cargo_actual_responsable !== "auditor") continue;
    for (const nit of equipoPorActividad.get(d.actividad_id) ?? []) {
      documentosPendientesPorNit.set(nit, (documentosPendientesPorNit.get(nit) ?? 0) + 1);
    }
  }
  const oficiosPendientesPorNit = new Map<string, number>();
  for (const o of oficiosAbiertos ?? []) {
    oficiosPendientesPorNit.set(
      o.responsable_elaboracion_nit,
      (oficiosPendientesPorNit.get(o.responsable_elaboracion_nit) ?? 0) + 1,
    );
  }
  const cargaTrabajo: FilaCargaTrabajo[] = (usuariosAuditores ?? []).map((u) => ({
    nit: u.nit,
    nombre: u.nombre,
    departamentoNombre: u.departamentos?.nombre ?? null,
    actividadesActivas: actividadesActivasPorNit.get(u.nit)?.size ?? 0,
    documentosPendientes: documentosPendientesPorNit.get(u.nit) ?? 0,
    oficiosPendientes: oficiosPendientesPorNit.get(u.nit) ?? 0,
  }));

  // Cumplimiento histórico de plazos.
  const cumplimientoHitos = calcularCumplimiento(
    (hitosConcluidos ?? []).map((h) => ({ esperada: h.fecha_fin_esperada!, real: h.fecha_fin_real! })),
  );
  const cumplimientoOficios = calcularCumplimiento(
    (oficiosConcluidos ?? []).map((o) => ({ esperada: o.fecha_vencimiento!, real: o.fecha_respuesta! })),
  );

  // Plan vs. real por etapa.
  const planVsReal = calcularPlanVsReal(
    (hitosConcluidos ?? []).map((h) => ({
      etapa: h.etapa,
      dias_habiles_esperados: h.dias_habiles_esperados,
      fecha_inicio_esperada: h.fecha_inicio_esperada,
      fecha_fin_real: h.fecha_fin_real!,
    })),
    feriados,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Semáforo por actividad: peor caso entre sus hitos y oficios abiertos (sección 5). Las
          actividades sin hitos u oficios capturados todavía no tienen semáforo activo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COLORES.map((color) => (
          <div key={color} className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{COLOR_SEMAFORO_LABELS[color]}</p>
            <p className="text-2xl font-semibold">{conteo[color]}</p>
            <p className="text-xs text-muted-foreground">
              {totalConDato > 0 ? `${Math.round((conteo[color] / totalConDato) * 100)}%` : "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actividad</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Semáforo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actividades && actividades.length > 0 ? (
              actividades.map((a) => {
                const color = colorPorActividad.get(a.id);
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/actividades/${a.id}`} className="font-medium hover:underline">
                        {a.no_nombramiento}
                      </Link>
                      <p className="text-xs text-muted-foreground">{a.dependencia_auditada}</p>
                    </TableCell>
                    <TableCell>{a.departamentos?.nombre ?? "—"}</TableCell>
                    <TableCell>
                      {color ? (
                        <Badge className={COLOR_SEMAFORO_CLASSES[color]}>{COLOR_SEMAFORO_LABELS[color]}</Badge>
                      ) : (
                        <Badge variant="outline">Sin datos</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  No hay actividades dentro de tu alcance todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Cuellos de botella</h2>
        <p className="text-sm text-muted-foreground">
          Días promedio que un documento permanece en manos de un mismo responsable antes de
          pasar al siguiente (solo tramos ya cerrados, no el documento que alguien tiene abierto
          ahora mismo).
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RankingTable
          titulo="Por cargo"
          descripcion="Independiente de departamento o tipo de documento."
          filas={rankingPorCargo}
          columnaClave="Cargo"
          etiquetaClave={(c) => CARGO_LABELS[c as CargoEnum] ?? c}
        />
        <RankingTable
          titulo="Por departamento"
          descripcion="Suma los tres cargos dentro de cada departamento."
          filas={rankingPorDepartamento}
          columnaClave="Departamento"
          etiquetaClave={(c) => c}
        />
        <RankingTable
          titulo="Por tipo de documento"
          descripcion="Del catálogo de 18 documentos (sección 4.5.1)."
          filas={rankingPorDocumento}
          columnaClave="Documento"
          etiquetaClave={(c) => c}
        />
      </div>

      <CargaTrabajoTable filas={cargaTrabajo} />

      <CumplimientoCards hitos={cumplimientoHitos} oficios={cumplimientoOficios} />

      <div className="rounded-lg border">
        <div className="border-b p-4">
          <h2 className="font-medium">Comparación plan vs. real por etapa</h2>
          <p className="text-xs text-muted-foreground">
            Días hábiles proyectados en el cronograma vs. días hábiles reales, promediados por
            etapa, entre los hitos ya concluidos dentro de tu alcance.
          </p>
        </div>
        <PlanVsRealChart datos={planVsReal} />
      </div>
    </div>
  );
}
