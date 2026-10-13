import Link from "next/link";
import { CalendarClock, ChevronRight, FileText, ListChecks, Mail, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { esJefaturaAuditoria, getUsuarioActual } from "@/lib/auth";
import { identificadorAuditoria } from "@/lib/auditoria";
import { sinCorregidos } from "@/lib/bi";
import { etiquetaCai, hoyGuatemala } from "@/lib/recomendaciones";
import {
  calcularSemaforo,
  COLOR_SEMAFORO_LABELS,
  diasHabilesEntre,
  UMBRAL_POR_DEFECTO,
  type ColorSemaforo,
  type UmbralSemaforo,
} from "@/lib/semaforo";
import { SemaforoChip } from "@/components/semaforo-chip";
import { StatCard } from "@/components/ui/stat-card";
import { CARGO_LABELS, ETAPA_ACTIVIDAD_LABELS, FASE_DOCUMENTO_LABELS } from "@/types/domain";

/** "2026-03-26" → "26/03/2026" */
const fecha = (iso: string) => iso.split("-").reverse().join("/");

type Pendiente = {
  id: string;
  titulo: string;
  contexto: string;
  detalle: string;
  href: string;
  boton: string;
  color?: ColorSemaforo | null;
  /** Para ordenar: lo más urgente primero (mayor = más urgente). */
  urgencia: number;
};

const URGENCIA: Record<ColorSemaforo, number> = { verde: 0, amarillo: 1, naranja: 2, rojo: 3 };

/**
 * Mis pendientes: todo lo que espera a quien entra, de todos los módulos, en una sola pantalla —
 * documentos a su cargo, oficios suyos sin respuesta (y, para la jefatura, los que están en
 * riesgo), actividades del cronograma en riesgo, seguimientos de recomendaciones donde está
 * nombrado y, para el Director, informes por cargar al SAG-UDAI. Cada fila lleva a donde se hace.
 * RLS ya limita todo al alcance del usuario.
 */
export default async function MisPendientesPage() {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  const cargo = usuario?.cargo ?? null;
  const nit = usuario?.nit ?? "";
  const jefatura = esJefaturaAuditoria(usuario);
  const esDirector = usuario?.cargo === "director";
  const hoy = hoyGuatemala();

  const [
    { data: documentos },
    { data: oficios },
    { data: hitos },
    { data: parametros },
    { data: feriadosRows },
    { data: nombramientos },
  ] = await Promise.all([
    cargo
      ? supabase
          .from("documentos_actividad")
          .select(
            "id, created_at, fase_actual, actividad_id, actividades(cai, anio_cai, no_nombramiento, dependencia_auditada, concluida), documentos_catalogo(nombre, orden, etapa), movimientos(id, timestamp, corrige_movimiento_id)",
          )
          .neq("fase_actual", "finalizado")
          .eq("cargo_actual_responsable", cargo)
      : Promise.resolve({ data: [] }),
    supabase
      .from("oficios")
      .select("id, no_oficio, asunto, destinatario, fecha_emision, fecha_vencimiento, fecha_envio, responsable_elaboracion_nit")
      .is("fecha_respuesta", null),
    cargo
      ? supabase
          .from("hitos_cronograma")
          .select("id, nombre, codigo_jerarquico, fecha_inicio_esperada, fecha_fin_esperada, cargo_responsable, actividad_id, actividades(cai, anio_cai, no_nombramiento, dependencia_auditada, concluida)")
          .is("fecha_fin_real", null)
      : Promise.resolve({ data: [] }),
    supabase.from("parametros_semaforo").select("*"),
    supabase.from("calendario_feriados").select("fecha"),
    supabase
      .from("documentos_seguimiento")
      .select(
        "id, no_nombramiento, no_documento, fecha_limite_informe, fecha_carga_sag_udai, coordinador_nit, tipo_documento, documentos_seguimiento_auditores(usuario_nit), documentos_seguimiento_informes(informes_auditoria(cai, anio_cai, dependencia_auditada))",
      )
      .is("fecha_carga_sag_udai", null),
  ]);

  const feriados = new Set((feriadosRows ?? []).map((f) => f.fecha));
  const umbral = new Map((parametros ?? []).map((p) => [p.ambito, p as UmbralSemaforo]));
  const umbralHito = umbral.get("hito") ?? UMBRAL_POR_DEFECTO;
  const umbralOficio = umbral.get("oficio") ?? UMBRAL_POR_DEFECTO;

  // ── Documentos a su cargo ──
  const pendDocumentos: Pendiente[] = (documentos ?? [])
    .filter((d) => !d.actividades?.concluida)
    .map((d) => {
      const ultimo = sinCorregidos(d.movimientos).map((m) => m.timestamp).sort().at(-1);
      const desde = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(new Date(ultimo ?? d.created_at));
      const dias = Math.max(diasHabilesEntre(desde, hoy, feriados) - 1, 0);
      const enRevision = d.fase_actual === "revision";
      return {
        id: d.id,
        titulo: `${d.documentos_catalogo?.orden ? `${d.documentos_catalogo.orden}. ` : ""}${d.documentos_catalogo?.nombre ?? "Documento"}`,
        contexto: `${d.actividades ? identificadorAuditoria(d.actividades) : ""} · ${d.actividades?.dependencia_auditada ?? ""}`,
        detalle: `${d.documentos_catalogo ? `${ETAPA_ACTIVIDAD_LABELS[d.documentos_catalogo.etapa]} · ` : ""}${FASE_DOCUMENTO_LABELS[d.fase_actual]} · lo tiene usted desde el ${fecha(desde)}${dias > 0 ? ` (${dias} ${dias === 1 ? "día hábil" : "días hábiles"})` : " (hoy)"}`,
        href: `/actividades/${d.actividad_id}?tab=documentos#doc-${d.id}`,
        boton: enRevision ? "Revisar documento" : "Ver documento",
        urgencia: dias,
      };
    })
    .sort((a, b) => b.urgencia - a.urgencia);

  // ── Oficios: los que usted elaboró sin respuesta; la jefatura ve además los que están en riesgo ──
  const pendOficios: Pendiente[] = (oficios ?? [])
    .map((o) => {
      const color = o.fecha_vencimiento ? calcularSemaforo(o.fecha_emision, o.fecha_vencimiento, hoy, feriados, umbralOficio) : null;
      return { o, color };
    })
    .filter(({ o, color }) => o.responsable_elaboracion_nit === nit || (jefatura && (color === "naranja" || color === "rojo")))
    .map(({ o, color }) => ({
      id: o.id,
      titulo: o.no_oficio,
      contexto: o.asunto,
      detalle: !o.fecha_envio
        ? "Falta registrar el envío"
        : `Para ${o.destinatario}${o.fecha_vencimiento ? ` · debe responder a más tardar el ${fecha(o.fecha_vencimiento)}` : ""}`,
      href: `/oficios/${o.id}`,
      boton: "Ver oficio",
      color,
      urgencia: color ? URGENCIA[color] : -1,
    }))
    .sort((a, b) => b.urgencia - a.urgencia);

  // ── Actividades del cronograma a su cargo que están por vencer o vencidas ──
  const pendCronograma: Pendiente[] = (hitos ?? [])
    .filter((h) => h.cargo_responsable === cargo && !h.actividades?.concluida)
    .map((h) => ({ h, color: calcularSemaforo(h.fecha_inicio_esperada, h.fecha_fin_esperada, hoy, feriados, umbralHito) }))
    .filter(({ color }) => color === "naranja" || color === "rojo")
    .map(({ h, color }) => ({
      id: h.id,
      titulo: `${h.codigo_jerarquico}. ${h.nombre}`,
      contexto: `${h.actividades ? identificadorAuditoria(h.actividades) : ""} · ${h.actividades?.dependencia_auditada ?? ""}`,
      detalle: `Plazo SAG-UDAI: ${h.fecha_fin_esperada < hoy ? "venció" : "vence"} el ${fecha(h.fecha_fin_esperada)}`,
      href: `/actividades/${h.actividad_id}?tab=cronograma#hito-${h.id}`,
      boton: "Ver cronograma",
      color,
      urgencia: URGENCIA[color],
    }))
    .sort((a, b) => b.urgencia - a.urgencia);

  // ── Seguimiento de recomendaciones ──
  const pendSeguimiento: Pendiente[] = (nombramientos ?? []).flatMap((n): Pendiente[] => {
    const cais = n.documentos_seguimiento_informes
      .map((i) => (i.informes_auditoria ? etiquetaCai(i.informes_auditoria.cai, i.informes_auditoria.anio_cai) : null))
      .filter(Boolean)
      .join(", ");
    const nombrado = n.coordinador_nit === nit || n.documentos_seguimiento_auditores.some((a) => a.usuario_nit === nit);
    if (!n.no_documento && nombrado) {
      return [
        {
          id: n.id,
          titulo: `Nombramiento ${n.no_nombramiento ?? ""}`.trim(),
          contexto: cais || "Seguimiento a recomendaciones",
          detalle: `Completar la cédula y emitir el informe${n.fecha_limite_informe ? ` · notificar a más tardar el ${fecha(n.fecha_limite_informe)}` : ""}`,
          href: `/recomendaciones/documentos/${n.id}`,
          boton: "Ver cédula",
          urgencia: n.fecha_limite_informe && n.fecha_limite_informe < hoy ? 3 : 1,
        },
      ];
    }
    if (n.no_documento && esDirector) {
      return [
        {
          id: n.id,
          titulo: `Informe ${n.no_documento}`,
          contexto: cais || "Seguimiento a recomendaciones",
          detalle: "Ya se emitió: falta registrar su carga al SAG-UDAI",
          href: `/recomendaciones/documentos/${n.id}`,
          boton: "Registrar carga",
          urgencia: 2,
        },
      ];
    }
    return [];
  });

  const total = pendDocumentos.length + pendOficios.length + pendCronograma.length + pendSeguimiento.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Mis pendientes</h1>
        <p className="text-muted-foreground">
          {total === 0
            ? "No tiene pendientes por ahora."
            : `Todo lo que espera de usted${cargo ? ` como ${CARGO_LABELS[cargo]}` : ""}, en un solo lugar: ${total} ${total === 1 ? "pendiente" : "pendientes"}.`}
        </p>
      </div>

      <div className="grid auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumen href="#documentos" icon={FileText} label="Documentos" detail="Entregar, revisar o aprobar" valor={pendDocumentos.length} />
        <Resumen href="#oficios" icon={Mail} label="Oficios" detail="Esperan respuesta" valor={pendOficios.length} />
        <Resumen href="#cronograma" icon={CalendarClock} label="Cronograma" detail="Plazos por vencer o vencidos" valor={pendCronograma.length} />
        <Resumen href="#seguimiento" icon={ListChecks} label="Recomendaciones" detail="Cédulas e informes" valor={pendSeguimiento.length} />
      </div>

      <Seccion id="documentos" titulo="Documentos a su cargo" vacio="No tiene documentos por entregar ni revisar." items={pendDocumentos} />
      <Seccion
        id="oficios"
        titulo={jefatura ? "Oficios sin respuesta (suyos y los que están en riesgo)" : "Sus oficios sin respuesta"}
        vacio="No tiene oficios esperando respuesta."
        items={pendOficios}
      />
      <Seccion
        id="cronograma"
        titulo="Actividades del cronograma por vencer o vencidas"
        vacio="Ninguna actividad del cronograma a su cargo está en riesgo."
        items={pendCronograma}
      />
      <Seccion
        id="seguimiento"
        titulo="Seguimiento a recomendaciones"
        vacio="No tiene cédulas ni informes de seguimiento pendientes."
        items={pendSeguimiento}
      />
    </div>
  );
}

function Resumen({ href, icon, label, detail, valor }: { href: string; icon: LucideIcon; label: string; detail: string; valor: number }) {
  return (
    <a href={href} className="block h-full rounded-2xl">
      <StatCard icon={icon} tone={valor > 0 ? "primary" : "verde"} label={label} value={String(valor)} detail={detail} className="h-full" />
    </a>
  );
}

function Seccion({ id, titulo, vacio, items }: { id: string; titulo: string; vacio: string; items: Pendiente[] }) {
  return (
    <section id={id} className="scroll-mt-4 rounded-xl border shadow-sm">
      <h2 className="border-b p-4 font-medium">
        {titulo} ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="p-4 text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="divide-y">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                href={p.href}
                className="group flex flex-col gap-3 p-5 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-lg font-medium">{p.titulo}</p>
                  <p className="text-muted-foreground">{p.contexto}</p>
                  <p className="text-muted-foreground">{p.detalle}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  {p.color ? <SemaforoChip tono={p.color} label={COLOR_SEMAFORO_LABELS[p.color]} /> : null}
                  <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 font-medium text-primary group-hover:bg-background">
                    {p.boton} <ChevronRight className="size-4" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
