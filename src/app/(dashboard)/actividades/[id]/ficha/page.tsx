import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { identificadorAuditoria } from "@/lib/auditoria";
import { hoyGuatemala } from "@/lib/recomendaciones";
import {
  COLOR_SEMAFORO_LABELS,
  semaforoConMotivoPorActividad,
  UMBRAL_POR_DEFECTO,
  type UmbralSemaforo,
} from "@/lib/semaforo";
import { BackLink } from "@/components/nav/back-link";
import { PrintButton } from "@/components/actividades/print-button";
import { GanttCronograma } from "@/components/actividades/gantt-cronograma";
import { SemaforoChip } from "@/components/semaforo-chip";
import { CARGO_LABELS, ETAPA_ACTIVIDAD_LABELS, FASE_DOCUMENTO_LABELS, type EtapaActividadEnum } from "@/types/domain";

const ETAPAS: EtapaActividadEnum[] = ["planificacion", "ejecucion", "comunicacion_resultados", "expediente_cierre"];
const dma = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

/**
 * Ficha de la auditoría en una hoja, para imprimir o guardar en PDF: datos, estado y semáforo con
 * su motivo, avance por etapa, cronograma (Gantt), documentos en curso y oficios. Lo que RLS no
 * deja ver al usuario, tampoco sale en la ficha.
 */
export default async function FichaAuditoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: a } = await supabase
    .from("actividades")
    .select("*, departamentos(nombre), auditor_principal:usuarios!actividades_auditor_principal_nit_fkey(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!a) notFound();

  const [{ data: equipo }, { data: documentos }, { data: hitos }, { data: oficios }, { data: parametros }, { data: feriadosRows }, { data: informe }] =
    await Promise.all([
      supabase.from("actividades_equipo").select("rol_en_equipo, usuarios(nombre, cargo)").eq("actividad_id", id),
      supabase
        .from("documentos_actividad")
        .select("id, fase_actual, cargo_actual_responsable, no_aplica, documentos_catalogo(nombre, orden, etapa)")
        .eq("actividad_id", id),
      supabase.from("hitos_cronograma").select("*").eq("actividad_id", id),
      supabase
        .from("oficios")
        .select("actividad_id, no_oficio, asunto, destinatario, fecha_emision, fecha_vencimiento, fecha_respuesta")
        .eq("actividad_id", id)
        .order("fecha_emision"),
      supabase.from("parametros_semaforo").select("*"),
      supabase.from("calendario_feriados").select("fecha"),
      supabase.from("informes_auditoria").select("id").eq("actividad_id", id).maybeSingle(),
    ]);

  const hoy = hoyGuatemala();
  const feriados = new Set((feriadosRows ?? []).map((f) => f.fecha));
  const umbral = new Map((parametros ?? []).map((p) => [p.ambito, p as UmbralSemaforo]));
  const semaforo = a.concluida
    ? null
    : semaforoConMotivoPorActividad(
        (hitos ?? []).filter((h) => !h.fecha_fin_real),
        hoy,
        feriados,
        umbral.get("hito") ?? UMBRAL_POR_DEFECTO,
      ).get(id);

  const hitosOrdenados = [...(hitos ?? [])].sort((x, y) => x.codigo_jerarquico.localeCompare(y.codigo_jerarquico, "es", { numeric: true }));
  const docs = [...(documentos ?? [])].sort((x, y) => (x.documentos_catalogo?.orden ?? 0) - (y.documentos_catalogo?.orden ?? 0));
  const enCurso = docs.filter((d) => d.fase_actual !== "finalizado");
  const indiceEtapa = ETAPAS.indexOf(a.etapa_actual);
  const generada = new Date().toLocaleString("es-GT", { dateStyle: "long", timeStyle: "short", timeZone: "America/Guatemala" });

  return (
    <div className="flex flex-col gap-5 print:gap-3">
      <div className="flex items-center justify-between print:hidden">
        <BackLink href={`/actividades/${id}`} label="Volver a la auditoría" />
        <PrintButton />
      </div>

      {/* Encabezado institucional */}
      <div className="flex items-center justify-between gap-4 border-b-2 border-primary pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- en impresión, una imagen simple es lo más fiable */}
        <img src="/minfin-logo-azul.png" alt="Ministerio de Finanzas Públicas" className="h-12 w-auto" />
        <div className="text-right">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">Dirección de Auditoría Interna</p>
          <p className="font-heading text-xl font-semibold">Ficha de la auditoría</p>
          <p className="text-xs text-muted-foreground">Generada el {generada} · SCIDAI</p>
        </div>
      </div>

      {/* Identificación y estado */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="codigo-expediente text-2xl font-semibold">{identificadorAuditoria(a)}</p>
          <p className="text-lg">{a.dependencia_auditada}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {a.concluida ? (
            <SemaforoChip tono="verde" label={`Concluida el ${dma(a.fecha_entrega_archivo)}`} />
          ) : semaforo ? (
            <SemaforoChip tono={semaforo.color} label={COLOR_SEMAFORO_LABELS[semaforo.color]} />
          ) : (
            <SemaforoChip tono="neutral" label="Sin plazos abiertos" />
          )}
          {semaforo && (semaforo.color === "naranja" || semaforo.color === "rojo") ? (
            <p className="max-w-80 text-right text-xs text-muted-foreground">{semaforo.motivo}.</p>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-x-6 gap-y-2 tarjeta p-4 text-sm print:gap-y-1 print:p-3 print:text-xs">
        <Dato label="Departamento" valor={a.departamentos?.nombre} />
        <Dato label="Tipo de auditoría" valor={a.tipo_auditoria} />
        <Dato label="Nombramiento" valor={a.no_nombramiento} />
        <Dato label="Período evaluado" valor={`Del ${dma(a.periodo_evaluado_inicio)} al ${dma(a.periodo_evaluado_fin)}`} />
        <Dato label="Inicio del plazo" valor={dma(a.fecha_inicio_plazo)} />
        <Dato label="Límite de notificación" valor={dma(a.fecha_notificacion)} />
        <Dato label="Auditor principal" valor={a.auditor_principal?.nombre} />
        <div className="col-span-2">
          <Dato
            label="Equipo"
            valor={(equipo ?? [])
              .map((m) => `${m.usuarios?.nombre ?? ""}${m.usuarios?.cargo ? ` (${CARGO_LABELS[m.usuarios.cargo]})` : ""}`)
              .join(", ") || "—"}
          />
        </div>
      </section>

      {/* Avance por etapa */}
      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Avance por etapa</h2>
        <ol className="grid grid-cols-4 gap-2">
          {ETAPAS.map((e, i) => {
            const delaEtapa = docs.filter((d) => d.documentos_catalogo?.etapa === e);
            const hechos = delaEtapa.filter((d) => d.fase_actual === "finalizado").length;
            const estado = a.concluida || i < indiceEtapa ? "Cerrada" : i === indiceEtapa ? "En curso" : "Pendiente";
            return (
              <li
                key={e}
                className={`rounded-lg border p-2 text-sm print:p-1.5 print:text-xs ${estado === "En curso" ? "border-primary bg-primary/5" : ""} ${estado === "Pendiente" ? "text-muted-foreground" : ""}`}
              >
                <p className="font-medium">{ETAPA_ACTIVIDAD_LABELS[e]}</p>
                <p className="text-xs">
                  {estado}
                  {delaEtapa.length > 0 ? ` · ${hechos} de ${delaEtapa.length} documentos` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Cronograma */}
      {hitosOrdenados.length > 0 ? (
        <div>
          <GanttCronograma hitos={hitosOrdenados} hoy={hoy} feriados={feriados} umbral={umbral.get("hito") ?? UMBRAL_POR_DEFECTO} compacto />
        </div>
      ) : (
        <p className="tarjeta p-4 text-sm text-muted-foreground">Todavía no se ha registrado el cronograma de actividades.</p>
      )}

      {/* Documentos en curso: en la impresión, desde la segunda hoja */}
      <section className="flex flex-col gap-2 print:break-before-page">
        <h2 className="font-medium">
          Documentos en curso ({enCurso.length} de {docs.length})
        </h2>
        {enCurso.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay documentos en curso.</p>
        ) : (
          <table className="w-full border text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 font-medium">Documento</th>
                <th className="p-2 font-medium">Etapa</th>
                <th className="p-2 font-medium">Fase</th>
                <th className="p-2 font-medium">Lo tiene</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {enCurso.map((d) => (
                <tr key={d.id} className="break-inside-avoid">
                  <td className="p-2">
                    {d.documentos_catalogo?.orden}. {d.documentos_catalogo?.nombre}
                  </td>
                  <td className="p-2">{d.documentos_catalogo ? ETAPA_ACTIVIDAD_LABELS[d.documentos_catalogo.etapa] : "—"}</td>
                  <td className="p-2">{FASE_DOCUMENTO_LABELS[d.fase_actual]}</td>
                  <td className="p-2">{CARGO_LABELS[d.cargo_actual_responsable]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Oficios */}
      <section className="flex break-inside-avoid flex-col gap-2">
        <h2 className="font-medium">Oficios ({(oficios ?? []).length})</h2>
        {(oficios ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay oficios relacionados.</p>
        ) : (
          <table className="w-full border text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 font-medium">No. de oficio</th>
                <th className="p-2 font-medium">Asunto</th>
                <th className="p-2 font-medium">Emisión</th>
                <th className="p-2 font-medium">Vence</th>
                <th className="p-2 font-medium">Respuesta</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(oficios ?? []).map((o) => (
                <tr key={o.no_oficio} className="break-inside-avoid">
                  <td className="p-2 whitespace-nowrap">{o.no_oficio}</td>
                  <td className="p-2">{o.asunto}</td>
                  <td className="p-2">{dma(o.fecha_emision)}</td>
                  <td className="p-2">{dma(o.fecha_vencimiento)}</td>
                  <td className="p-2">{o.fecha_respuesta ? dma(o.fecha_respuesta) : "Pendiente"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-sm text-muted-foreground">
        Inventario de recomendaciones: {informe ? "registrado en el módulo de Recomendaciones." : "todavía no registrado."}
      </p>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{valor || "—"}</p>
    </div>
  );
}
