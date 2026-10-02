import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SemaforoChip } from "@/components/semaforo-chip";
import { estaVencida, etiquetaCai } from "@/lib/recomendaciones";
import { cn } from "@/lib/utils";
import {
  ESTADO_RECOMENDACION_LABELS,
  ESTADO_RECOMENDACION_TONO,
  TIPO_DOCUMENTO_SEGUIMIENTO_LABELS,
  type EstadoRecomendacionEnum,
} from "@/types/domain";

// Nombramiento/documento con sus auditores nombrados.
const DOCUMENTO_CAMPOS = "*, documentos_seguimiento_auditores(usuarios(nombre))";

export default async function RecomendacionDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();

  const { data: recomendacion } = await supabase
    .from("recomendaciones")
    .select(
      `*, deficiencias(numero, titulo, descripcion, informes_auditoria(*, departamentos(nombre))),
       seguimientos_recomendacion(*, documentos_seguimiento(${DOCUMENTO_CAMPOS}))`,
    )
    .eq("id", id)
    .maybeSingle();

  // RLS decide la visibilidad (mismo criterio que el informe): sin fila, es un 404.
  const deficiencia = recomendacion?.deficiencias;
  const informe = deficiencia?.informes_auditoria;
  if (!recomendacion || !deficiencia || !informe) notFound();

  const historial = [...recomendacion.seguimientos_recomendacion].sort((a, b) => a.numero_seguimiento - b.numero_seguimiento);
  const estadoInicial = historial.find((s) => s.numero_seguimiento === 0);
  const seguimientos = historial.filter((s) => s.documentos_seguimiento);
  const cumplida = recomendacion.estado_actual === "cumplida";
  const vencida = estaVencida(recomendacion.estado_actual, recomendacion.fecha_implementacion);

  // Nombramientos de seguimiento que cubren este informe, todavía sin emitir (la cédula se cierra
  // al emitirse) y que no evaluaron esta recomendación: el "siguiente paso" del ciclo.
  const usados = new Set(seguimientos.map((s) => s.documento_id));
  const { data: cobertura } = cumplida
    ? { data: [] }
    : await supabase
        .from("documentos_seguimiento_informes")
        .select(`documentos_seguimiento(${DOCUMENTO_CAMPOS})`)
        .eq("informe_id", informe.id);
  const enCurso = (cobertura ?? [])
    .flatMap((c) => (c.documentos_seguimiento ? [c.documentos_seguimiento] : []))
    .filter((d) => !d.no_documento && !usados.has(d.id))
    .sort((a, b) => (a.fecha_nombramiento ?? "").localeCompare(b.fecha_nombramiento ?? ""));

  const identificacion = [etiquetaCai(informe.cai), informe.no_nombramiento].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <BackLink href="/recomendaciones" label="Volver a las recomendaciones" />
        <BackLink href={`/recomendaciones/cai/${informe.id}`} label={`Volver al ${etiquetaCai(informe.cai) ?? "CAI"}`} />
      </div>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <SemaforoChip
              tono={ESTADO_RECOMENDACION_TONO[recomendacion.estado_actual]}
              label={ESTADO_RECOMENDACION_LABELS[recomendacion.estado_actual]}
            />
          </div>
          <CardTitle className="text-lg">
            Def. {deficiencia.numero} · {deficiencia.titulo}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            <span className="codigo-expediente font-medium text-foreground">{identificacion}</span> ·{" "}
            {informe.dependencia_auditada} · {informe.departamentos?.nombre} ·{" "}
            <Link href={`/recomendaciones/informes/${informe.id}`} className="underline-offset-2 hover:underline">
              Ver informe completo
            </Link>
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          {deficiencia.descripcion ? <Bloque titulo="Deficiencia" texto={deficiencia.descripcion} /> : null}
          <Bloque titulo={`Recomendación ${recomendacion.numero}`} texto={recomendacion.texto} />
          <div className="grid gap-4 sm:grid-cols-2">
            {recomendacion.responsables ? (
              <Bloque titulo="Responsables de implementarla" texto={recomendacion.responsables} />
            ) : null}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Fecha de implementación</p>
              <p className={cn(vencida && "font-medium text-destructive")}>
                {recomendacion.fecha_implementacion ?? "—"}
                {vencida ? " · vencida" : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Ciclo de seguimiento</h2>
        <ol className="relative flex flex-col gap-4 border-l pl-6">
          <Paso
            titulo="Informe final"
            subtitulo={[
              informe.fecha_informe_final ? `Emitido el ${informe.fecha_informe_final}` : null,
              informe.fecha_notificacion ? `notificado el ${informe.fecha_notificacion}` : null,
            ]
              .filter(Boolean)
              .join(", ")}
            estado={estadoInicial?.estado ?? "pendiente"}
          />

          {seguimientos.map((s) => (
            <Paso
              key={s.id}
              titulo={`Seguimiento no. ${s.numero_seguimiento}`}
              estado={s.estado}
              documento={<DatosDocumento documento={s.documentos_seguimiento!} />}
              acciones={s.acciones_responsables}
              comentario={s.comentario_auditoria}
            />
          ))}

          {enCurso.map((d) => (
            <li key={d.id} className="relative">
              <span className="absolute top-1 -left-[1.9rem] size-3 rounded-full border-2 border-dashed border-muted-foreground/60 bg-background ring-4 ring-background" />
              <p className="font-medium">Seguimiento en curso</p>
              <DatosDocumento documento={d} />
              <p className="text-xs text-muted-foreground">
                Pendiente de registrar el resultado. Se registra junto con las demás recomendaciones del CAI, en el panel de
                seguimiento del nombramiento.{" "}
                <Link href={`/recomendaciones/cai/${informe.id}`} className="font-medium text-foreground underline-offset-2 hover:underline">
                  Ir al CAI
                </Link>
              </p>
            </li>
          ))}

          {cumplida ? (
            <li className="relative">
              <span className="absolute top-1 -left-[1.9rem] size-3 rounded-full bg-foreground ring-4 ring-background" />
              <p className="font-medium">Ciclo cerrado</p>
              <p className="text-xs text-muted-foreground">
                La recomendación quedó cumplida; ya no admite más seguimientos.
              </p>
            </li>
          ) : null}
        </ol>
      </section>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button variant="outline" className="w-fit" render={<Link href={`/recomendaciones/cai/${informe.id}`} />}>
        Ir al {etiquetaCai(informe.cai) ?? "CAI"} para darle seguimiento
      </Button>
    </div>
  );
}

function DatosDocumento({
  documento,
}: {
  documento: {
    id: string;
    tipo_documento: keyof typeof TIPO_DOCUMENTO_SEGUIMIENTO_LABELS;
    no_nombramiento: string | null;
    fecha_nombramiento: string | null;
    no_documento: string | null;
    fecha_documento: string | null;
    fecha_carga_sag_udai: string | null;
    documentos_seguimiento_auditores: { usuarios: { nombre: string } | null }[];
  };
}) {
  const auditores = documento.documentos_seguimiento_auditores.flatMap((a) => (a.usuarios ? [a.usuarios.nombre] : []));
  return (
    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
      {documento.no_nombramiento ? (
        <span>
          Nombramiento <span className="codigo-expediente text-foreground">{documento.no_nombramiento}</span>
          {documento.fecha_nombramiento ? ` del ${documento.fecha_nombramiento}` : ""}
        </span>
      ) : null}
      {auditores.length ? (
        <span>
          {auditores.length === 1 ? "Auditor nombrado" : "Auditores nombrados"}:{" "}
          <span className="text-foreground">{auditores.join(", ")}</span>
        </span>
      ) : null}
      <span>
        {TIPO_DOCUMENTO_SEGUIMIENTO_LABELS[documento.tipo_documento]}{" "}
        <Link
          href={`/recomendaciones/documentos/${documento.id}`}
          className="codigo-expediente text-foreground underline-offset-2 hover:underline"
        >
          {documento.no_documento ?? "en elaboración"}
        </Link>
        {documento.fecha_documento ? ` del ${documento.fecha_documento}` : ""}
        {documento.no_documento
          ? documento.fecha_carga_sag_udai
            ? ` · cargado al SAG-UDAI el ${documento.fecha_carga_sag_udai}`
            : " · pendiente de SAG-UDAI"
          : ""}
      </span>
    </div>
  );
}

function Paso({
  titulo,
  subtitulo,
  estado,
  documento,
  acciones,
  comentario,
}: {
  titulo: string;
  subtitulo?: string;
  estado: EstadoRecomendacionEnum;
  documento?: React.ReactNode;
  acciones?: string | null;
  comentario?: string | null;
}) {
  return (
    <li className="relative">
      <span
        className={cn(
          "absolute top-1 -left-[1.9rem] size-3 rounded-full ring-4 ring-background",
          "bg-muted-foreground/40",
        )}
      />
      {/* El estado de cada paso va como texto: el único indicador de color es el del estado
       * actual, en el encabezado. */}
      <p className="font-medium">
        {titulo} <span className="font-normal text-muted-foreground">· Resultado: {ESTADO_RECOMENDACION_LABELS[estado]}</span>
      </p>
      {subtitulo ? <p className="text-xs text-muted-foreground">{subtitulo}</p> : null}
      {documento}
      {acciones || comentario ? (
        <div className="mt-2 grid gap-3 rounded-md border bg-muted/30 p-3 text-sm md:grid-cols-2">
          {acciones ? <Bloque titulo="Acciones de los responsables" texto={acciones} /> : null}
          {comentario ? <Bloque titulo="Comentario de auditoría" texto={comentario} /> : null}
        </div>
      ) : null}
    </li>
  );
}

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      <p className="whitespace-pre-line">{texto}</p>
    </div>
  );
}
