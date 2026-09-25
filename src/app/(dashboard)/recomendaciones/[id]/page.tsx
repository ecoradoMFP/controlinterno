import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { departamentosParaNombrarSeguimiento, getUsuarioActual, puedeDarSeguimiento } from "@/lib/auth";
import { registrarSeguimiento } from "@/app/(dashboard)/recomendaciones/actions";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SemaforoChip } from "@/components/semaforo-chip";
import { estaVencida, etiquetaCai } from "@/lib/recomendaciones";
import { cn } from "@/lib/utils";
import {
  ESTADO_RECOMENDACION_LABELS,
  ESTADO_RECOMENDACION_TONO,
  TIPO_DOCUMENTO_SEGUIMIENTO_LABELS,
  type EstadoRecomendacionEnum,
} from "@/types/domain";

// Mismo orden de columnas que la cédula impresa: Cumplida / No cumplida / En proceso / Pendiente.
const OPCIONES_ESTADO: EstadoRecomendacionEnum[] = ["cumplida", "no_cumplida", "en_proceso", "pendiente"];

// Nombramiento/documento con sus auditores nombrados.
const DOCUMENTO_CAMPOS = "*, documentos_seguimiento_auditores(usuarios(nombre))";

const SELECT_CLASES =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function RecomendacionDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; fieldErrors?: string }>;
}) {
  const { id } = await params;
  const { error, fieldErrors: fieldErrorsRaw } = await searchParams;
  const fieldErrors = fieldErrorsRaw ? (JSON.parse(fieldErrorsRaw) as Record<string, string>) : {};

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

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
  const [puedeEditar, gestionables] = await Promise.all([
    cumplida ? false : puedeDarSeguimiento(usuario, informe.id, supabase),
    departamentosParaNombrarSeguimiento(usuario, supabase),
  ]);
  const puedeNombrar = !cumplida && gestionables.includes(informe.departamento_id);

  // Nombramientos de seguimiento que cubren este informe y todavía no evaluaron esta
  // recomendación: son el "siguiente paso" del ciclo mientras siga abierta.
  const usados = new Set(seguimientos.map((s) => s.documento_id));
  const { data: cobertura } = cumplida
    ? { data: [] }
    : await supabase
        .from("documentos_seguimiento_informes")
        .select(`documentos_seguimiento(${DOCUMENTO_CAMPOS})`)
        .eq("informe_id", informe.id);
  const enCurso = (cobertura ?? [])
    .flatMap((c) => (c.documentos_seguimiento ? [c.documentos_seguimiento] : []))
    .filter((d) => !usados.has(d.id))
    .sort((a, b) => (a.fecha_nombramiento ?? "").localeCompare(b.fecha_nombramiento ?? ""));

  const identificacion = [etiquetaCai(informe.cai), informe.no_nombramiento].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/recomendaciones" label="Volver a la bandeja de recomendaciones" />

      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <SemaforoChip
              tono={ESTADO_RECOMENDACION_TONO[recomendacion.estado_actual]}
              label={ESTADO_RECOMENDACION_LABELS[recomendacion.estado_actual]}
            />
            {vencida ? <SemaforoChip tono="naranja" label="Vencida" /> : null}
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
            <Bloque titulo="Fecha de implementación" texto={recomendacion.fecha_implementacion ?? "—"} />
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
              <p className="text-xs text-muted-foreground">Pendiente de registrar el resultado de esta recomendación.</p>
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

      {!cumplida && enCurso.length === 0 && (puedeEditar || puedeNombrar) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4 text-sm">
          <p className="text-muted-foreground">
            Para registrar el siguiente seguimiento primero debe emitirse un nombramiento de seguimiento que cubra este
            informe.
          </p>
          {puedeNombrar ? (
            <Button render={<Link href={`/recomendaciones/documentos/nuevo?informe=${informe.id}`} />}>
              Emitir nombramiento de seguimiento
            </Button>
          ) : null}
        </div>
      ) : null}

      {puedeEditar && enCurso.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrar seguimiento no. {seguimientos.length + 1}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={registrarSeguimiento} className="flex flex-col gap-5">
              <input type="hidden" name="recomendacion_id" value={recomendacion.id} />

              <Campo label="Nombramiento de seguimiento" htmlFor="documento_id" error={fieldErrors.documento_id}>
                <select id="documento_id" name="documento_id" required defaultValue={enCurso.length === 1 ? enCurso[0].id : ""} className={SELECT_CLASES}>
                  <option value="" disabled>
                    Selecciona el nombramiento
                  </option>
                  {enCurso.map((d) => (
                    <option key={d.id} value={d.id}>
                      {[d.no_nombramiento ? `Nombramiento ${d.no_nombramiento}` : null, d.no_documento].filter(Boolean).join(" · ")}
                    </option>
                  ))}
                </select>
              </Campo>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Estado de la recomendación</legend>
                <div className="flex flex-wrap gap-2">
                  {OPCIONES_ESTADO.map((e) => (
                    <label
                      key={e}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary/5"
                    >
                      <input type="radio" name="estado" value={e} required className="accent-primary" />
                      {ESTADO_RECOMENDACION_LABELS[e]}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Al marcarla como cumplida se cierra su ciclo: ya no se podrán registrar más seguimientos.
                </p>
              </fieldset>

              <div className="grid gap-4 md:grid-cols-2">
                <Campo label="Acciones de los responsables" htmlFor="acciones_responsables">
                  <Textarea id="acciones_responsables" name="acciones_responsables" rows={5} />
                </Campo>
                <Campo label="Comentario de auditoría" htmlFor="comentario_auditoria">
                  <Textarea id="comentario_auditoria" name="comentario_auditoria" rows={5} />
                </Campo>
              </div>

              <Button type="submit" className="w-fit">
                Registrar seguimiento
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
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

function Campo({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
