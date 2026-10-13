import Link from "next/link";
import { ChevronRight, Clock, FileText, Hand, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";
import { identificadorAuditoria } from "@/lib/auditoria";
import { sinCorregidos } from "@/lib/bi";
import { hoyGuatemala } from "@/lib/recomendaciones";
import { diasHabilesEntre } from "@/lib/semaforo";
import { sinTildes } from "@/lib/texto";
import { cn } from "@/lib/utils";
import { FiltrosAutomaticos } from "@/components/recomendaciones/filtros-automaticos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { CARGO_LABELS, ETAPA_ACTIVIDAD_LABELS, FASE_DOCUMENTO_LABELS } from "@/types/domain";

const RUTA = "/documentos";

/**
 * Bandeja de documentos en curso de todas las auditorías: por defecto, los que esperan al cargo de
 * quien entra. Cada fila dice de qué auditoría es, en qué fase va, quién lo tiene y desde cuándo
 * (días hábiles), con los que más esperan primero. Se trabaja dentro de la auditoría.
 */
export default async function DocumentosPage({ searchParams }: { searchParams: Promise<{ vista?: string; q?: string }> }) {
  const { vista: vistaParam, q: qParam } = await searchParams;
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  // RLS (authz.puede_ver_actividad, vía documentos_actividad_select) ya limita al alcance del usuario.
  const [{ data: documentos, error }, { data: feriadosRows }] = await Promise.all([
    supabase
      .from("documentos_actividad")
      .select(
        "id, created_at, fase_actual, cargo_actual_responsable, actividad_id, actividades(cai, anio_cai, no_nombramiento, dependencia_auditada), documentos_catalogo(nombre, orden, etapa), movimientos(id, timestamp, corrige_movimiento_id)",
      )
      .neq("fase_actual", "finalizado"),
    supabase.from("calendario_feriados").select("fecha"),
  ]);

  const hoy = hoyGuatemala();
  const feriados = new Set((feriadosRows ?? []).map((f) => f.fecha));
  const cargo = usuario?.cargo ?? null;
  const q = sinTildes(qParam ?? "").trim();

  const filas = (documentos ?? []).map((d) => {
    // Desde cuándo lo tiene su cargo actual: el último movimiento válido (o su creación).
    const ultimo = sinCorregidos(d.movimientos)
      .map((m) => m.timestamp)
      .sort()
      .at(-1);
    const desde = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(new Date(ultimo ?? d.created_at));
    return { ...d, desde, dias: Math.max(diasHabilesEntre(desde, hoy, feriados) - 1, 0) };
  });
  const base = filas.filter(
    (d) =>
      !q ||
      sinTildes(
        [d.documentos_catalogo?.nombre, d.actividades ? identificadorAuditoria(d.actividades) : "", d.actividades?.dependencia_auditada].join(" "),
      ).includes(q),
  );
  const vista = ["revision", "todos"].includes(vistaParam ?? "") ? vistaParam! : cargo ? "mios" : "todos";
  const visibles = base
    .filter((d) => (vista === "mios" ? d.cargo_actual_responsable === cargo : vista === "revision" ? d.fase_actual === "revision" : true))
    .sort((a, b) => b.dias - a.dias);

  const urlCon = (v: string) => {
    const params = new URLSearchParams(Object.entries({ vista: v === "mios" ? "" : v, q: qParam ?? "" }).filter(([, x]) => x));
    return `${RUTA}${params.size ? `?${params}` : ""}`;
  };
  const kpi = (clave: string, label: string, detail: string, valor: number, icon: LucideIcon, tone: "accent" | "primary" | "amarillo") => (
    <Link
      key={clave}
      href={urlCon(clave)}
      aria-pressed={vista === clave}
      className={cn("block h-full rounded-2xl", vista === clave && "ring-2 ring-primary")}
    >
      <StatCard icon={icon} tone={tone} label={label} value={String(valor)} detail={detail} className="h-full" />
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Documentos</h1>
        <p className="text-muted-foreground">
          Documentos de las auditorías que todavía no se finalizan. Seleccione uno para entregarlo, revisarlo o aprobarlo.
        </p>
      </div>

      {error ? <p className="text-destructive">No se pudieron cargar los documentos.</p> : null}

      <div className={cn("grid auto-rows-fr grid-cols-2 gap-3", cargo ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
        {cargo
          ? kpi("mios", "A su cargo", `Esperan al ${CARGO_LABELS[cargo]}`, base.filter((d) => d.cargo_actual_responsable === cargo).length, Hand, "primary")
          : null}
        {kpi("revision", "En revisión", "Entregados, esperan visto bueno", base.filter((d) => d.fase_actual === "revision").length, Clock, "amarillo")}
        {kpi("todos", "Todos en curso", "Sin importar quién los tiene", base.length, FileText, "accent")}
      </div>

      <div className="rounded-xl border shadow-sm">
        <FiltrosAutomaticos ruta={RUTA} className="flex flex-wrap items-center gap-3 border-b p-4">
          <input type="hidden" name="vista" value={vista === "mios" ? "" : vista} />
          <Input
            name="q"
            type="text"
            defaultValue={qParam ?? ""}
            placeholder="Buscar por documento, CAI o dependencia"
            aria-label="Buscar documentos"
            className="h-10 min-w-64 flex-1 sm:max-w-md"
          />
          {q ? (
            <Button variant="outline" nativeButton={false} render={<Link href={urlCon(vista)} />}>
              Quitar búsqueda
            </Button>
          ) : null}
        </FiltrosAutomaticos>

        {visibles.length === 0 ? (
          <p className="p-6 text-muted-foreground">
            {q
              ? "Ningún documento coincide con la búsqueda."
              : vista === "mios"
                ? "No tiene documentos pendientes por ahora."
                : "No hay documentos en curso."}
          </p>
        ) : (
          <ul className="divide-y">
            {visibles.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/actividades/${d.actividad_id}?tab=documentos#doc-${d.id}`}
                  className="group flex flex-col gap-3 p-5 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="text-lg font-medium">
                      {d.documentos_catalogo?.orden ? `${d.documentos_catalogo.orden}. ` : ""}
                      {d.documentos_catalogo?.nombre ?? "Documento"}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="codigo-expediente text-foreground">{d.actividades ? identificadorAuditoria(d.actividades) : "—"}</span>
                      {d.actividades?.dependencia_auditada ? ` · ${d.actividades.dependencia_auditada}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {d.documentos_catalogo ? `${ETAPA_ACTIVIDAD_LABELS[d.documentos_catalogo.etapa]} · ` : ""}
                      <span className="text-foreground">{FASE_DOCUMENTO_LABELS[d.fase_actual]}</span> · Lo tiene el{" "}
                      {CARGO_LABELS[d.cargo_actual_responsable]} desde el {d.desde.split("-").reverse().join("/")}
                      {d.dias > 0 ? ` (${d.dias} ${d.dias === 1 ? "día hábil" : "días hábiles"})` : " (hoy)"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    {cargo && d.cargo_actual_responsable === cargo ? <Badge className="h-7 px-3 text-sm">A su cargo</Badge> : null}
                    <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 font-medium text-primary group-hover:bg-background">
                      Ver documento <ChevronRight className="size-4" aria-hidden />
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
