import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";
import { identificadorAuditoria } from "@/lib/auditoria";
import { generarCronogramaXlsx } from "@/lib/cronograma-excel";
import { hoyGuatemala } from "@/lib/recomendaciones";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  if (!usuario) return new Response("No autenticado", { status: 401 });

  const { data: a } = await supabase
    .from("actividades")
    .select(
      "cai, anio_cai, no_nombramiento, dependencia_auditada, tipo_auditoria, area, periodo_evaluado_inicio, periodo_evaluado_fin, departamentos(nombre), auditor_principal:usuarios!actividades_auditor_principal_nit_fkey(nombre)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!a) return new Response("No encontrado", { status: 404 });

  const [{ data: hitos }, { data: asuetos }] = await Promise.all([
    supabase
      .from("hitos_cronograma")
      .select("codigo_jerarquico, nombre, etapa, fecha_inicio_esperada, fecha_fin_esperada, dias_habiles_esperados, fecha_fin_real")
      .eq("actividad_id", id),
    supabase.from("calendario_feriados").select("fecha, descripcion").order("fecha"),
  ]);
  const actividades = (hitos ?? [])
    .sort((x, y) => x.codigo_jerarquico.localeCompare(y.codigo_jerarquico, "es", { numeric: true }))
    .map((h) => ({
      codigo: h.codigo_jerarquico,
      nombre: h.nombre,
      etapa: h.etapa,
      del: h.fecha_inicio_esperada,
      al: h.fecha_fin_esperada,
      dias: h.dias_habiles_esperados,
      real: h.fecha_fin_real,
    }));
  const desde = actividades.map((x) => x.del).sort()[0];
  const hasta = actividades.map((x) => x.al).sort().at(-1);

  const cai = identificadorAuditoria(a);
  const buffer = await generarCronogramaXlsx({
    cai,
    dependencia: a.dependencia_auditada,
    tipo: a.tipo_auditoria,
    departamento: a.departamentos?.nombre ?? "",
    nombramiento: a.no_nombramiento,
    area: a.area,
    periodoInicio: a.periodo_evaluado_inicio,
    periodoFin: a.periodo_evaluado_fin,
    auditorPrincipal: a.auditor_principal?.nombre ?? "",
    hoy: hoyGuatemala(),
    usuario: usuario.nombre,
    actividades,
    asuetos: desde && hasta ? (asuetos ?? []).filter((x) => x.fecha >= desde && x.fecha <= hasta) : [],
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Cronograma ${cai}.xlsx"`,
    },
  });
}
