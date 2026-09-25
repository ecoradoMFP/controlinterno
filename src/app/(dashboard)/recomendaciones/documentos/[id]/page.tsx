import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { departamentosParaNombrarSeguimiento, getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { registrarCargaSagUdai, registrarDocumentoEmitido } from "@/app/(dashboard)/recomendaciones/actions";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SemaforoChip } from "@/components/semaforo-chip";
import { etiquetaCai } from "@/lib/recomendaciones";
import {
  ESTADO_RECOMENDACION_LABELS,
  ESTADO_RECOMENDACION_TONO,
  TIPO_DOCUMENTO_SEGUIMIENTO_LABELS,
  type EstadoRecomendacionEnum,
} from "@/types/domain";

const COLUMNAS_ESTADO: EstadoRecomendacionEnum[] = ["cumplida", "no_cumplida", "en_proceso", "pendiente"];

/**
 * Nombramiento de seguimiento y el informe/oficio que resulta: auditores nombrados, CAI que
 * cubre, la cédula con el resultado de cada recomendación evaluada y las que faltan por evaluar.
 */
export default async function DocumentoSeguimientoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  const { data: documento } = await supabase
    .from("documentos_seguimiento")
    .select(
      `*, departamentos(nombre), documentos_seguimiento_auditores(usuario_nit, usuarios(nombre, puesto, cargo)),
       documentos_seguimiento_informes(informes_auditoria(id, no_nombramiento, cai, dependencia_auditada,
         deficiencias(numero, titulo, recomendaciones(id, numero, texto, estado_actual))))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!documento) notFound();

  // Evaluaciones registradas en este documento (RLS: solo las de recomendaciones visibles).
  const { data: evaluaciones } = await supabase
    .from("seguimientos_recomendacion")
    .select("recomendacion_id, numero_seguimiento, estado, comentario_auditoria")
    .eq("documento_id", id);
  const evaluacionPorRecomendacion = new Map((evaluaciones ?? []).map((e) => [e.recomendacion_id, e]));

  // Cédula: lo que este documento evaluó y, mientras no se emita (la emisión la cierra), las
  // recomendaciones abiertas de los CAI cubiertos que faltan por evaluar.
  const emitido = !!documento.no_documento;
  const filas = documento.documentos_seguimiento_informes
    .flatMap((c) => (c.informes_auditoria ? [c.informes_auditoria] : []))
    .sort((a, b) => (a.cai ?? a.no_nombramiento ?? "").localeCompare(b.cai ?? b.no_nombramiento ?? ""))
    .flatMap((informe) =>
      [...informe.deficiencias]
        .sort((a, b) => a.numero - b.numero)
        .flatMap((d) =>
          [...d.recomendaciones]
            .sort((a, b) => a.numero - b.numero)
            .map((r) => ({ informe, deficiencia: d, recomendacion: r, evaluacion: evaluacionPorRecomendacion.get(r.id) })),
        ),
    )
    .filter((f) => f.evaluacion || (!emitido && f.recomendacion.estado_actual !== "cumplida"));

  const porEvaluar = filas.filter((f) => !f.evaluacion).length;
  const totales = Object.fromEntries(
    COLUMNAS_ESTADO.map((e) => [e, filas.filter((f) => f.evaluacion?.estado === e).length]),
  ) as Record<EstadoRecomendacionEnum, number>;

  const esDirector = puedeEscribir(usuario) && usuario?.cargo === "director";
  const esAuditorNombrado = documento.documentos_seguimiento_auditores.some((a) => a.usuario_nit === usuario?.nit);
  const gestionables = await departamentosParaNombrarSeguimiento(usuario, supabase);
  const puedeGestionar = puedeEscribir(usuario) && (esAuditorNombrado || gestionables.includes(documento.departamento_id));

  const cais = documento.documentos_seguimiento_informes
    .flatMap((c) => (c.informes_auditoria ? [c.informes_auditoria] : []))
    .map((i) => [etiquetaCai(i.cai), i.no_nombramiento].filter(Boolean).join(" · "));

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/recomendaciones" label="Volver a la bandeja de recomendaciones" />

      <Card>
        <CardHeader className="gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Seguimiento a recomendaciones · {TIPO_DOCUMENTO_SEGUIMIENTO_LABELS[documento.tipo_documento]}
          </p>
          <CardTitle className="codigo-expediente text-lg">
            {documento.no_documento ??
              (documento.no_nombramiento
                ? `Nombramiento ${documento.no_nombramiento}`
                : `${TIPO_DOCUMENTO_SEGUIMIENTO_LABELS[documento.tipo_documento]} en elaboración`)}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {[
              documento.no_documento
                ? documento.fecha_documento
                  ? `Emitido el ${documento.fecha_documento}`
                  : null
                : `${TIPO_DOCUMENTO_SEGUIMIENTO_LABELS[documento.tipo_documento]} en elaboración`,
              documento.no_nombramiento && documento.no_documento
                ? `Nombramiento ${documento.no_nombramiento}${documento.fecha_nombramiento ? ` del ${documento.fecha_nombramiento}` : ""}`
                : documento.fecha_nombramiento
                  ? `Nombrado el ${documento.fecha_nombramiento}`
                  : null,
              documento.departamentos?.nombre,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {documento.documentos_seguimiento_auditores.length === 1 ? "Auditor nombrado" : "Auditores nombrados"}
              </p>
              {documento.documentos_seguimiento_auditores.length === 0 ? (
                <p className="text-muted-foreground">Sin registrar</p>
              ) : (
                <ul>
                  {documento.documentos_seguimiento_auditores.map((a) => (
                    <li key={a.usuario_nit}>
                      {a.usuarios?.nombre}
                      {a.usuarios?.puesto ? <span className="text-muted-foreground"> — {a.usuarios.puesto}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">CAI / informes que cubre</p>
              <p className="codigo-expediente">{cais.join(" · ") || "—"}</p>
            </div>
          </div>

          {!documento.no_documento && puedeGestionar ? (
            <form action={registrarDocumentoEmitido} className="flex flex-wrap items-end gap-2 rounded-md border border-dashed p-3">
              <input type="hidden" name="documento_id" value={documento.id} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground" htmlFor="no_documento">
                  No. de {documento.tipo_documento === "oficio" ? "oficio" : "informe"} emitido
                </label>
                <Input id="no_documento" name="no_documento" placeholder="DAI-DAF-SR-CAI-04-2026" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground" htmlFor="fecha_documento">
                  Fecha
                </label>
                <Input id="fecha_documento" name="fecha_documento" type="date" required />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Registrar emisión
              </Button>
              <p className="basis-full text-xs text-muted-foreground">
                Al registrar la emisión se cierra la cédula: ya no se podrán agregar evaluaciones.
                {porEvaluar > 0 ? ` Todavía faltan ${porEvaluar} recomendación(es) por evaluar.` : ""}
              </p>
            </form>
          ) : null}

          {documento.no_documento ? (
            documento.fecha_carga_sag_udai ? (
              <p>Cargado al SAG-UDAI el {documento.fecha_carga_sag_udai}.</p>
            ) : esDirector ? (
              <form action={registrarCargaSagUdai} className="flex flex-wrap items-end gap-2 rounded-md border border-dashed p-3">
                <input type="hidden" name="documento_id" value={documento.id} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground" htmlFor="fecha_carga_sag_udai">
                    Pendiente de cargar al SAG-UDAI · fecha de carga
                  </label>
                  <Input id="fecha_carga_sag_udai" name="fecha_carga_sag_udai" type="date" required />
                </div>
                <Button type="submit" variant="outline" size="sm">
                  Registrar carga
                </Button>
              </form>
            ) : (
              <p className="text-muted-foreground">Pendiente de cargar al SAG-UDAI (lo registra el Director).</p>
            )
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-medium">Cédula de seguimiento</h2>
          {porEvaluar > 0 ? (
            <p className="text-xs text-muted-foreground">{porEvaluar} recomendación(es) por evaluar en este seguimiento</p>
          ) : null}
        </div>
        {filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Los CAI cubiertos no tienen recomendaciones abiertas.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filas.map((f) => (
              <Link
                key={f.recomendacion.id}
                href={`/recomendaciones/${f.recomendacion.id}`}
                className="flex flex-col gap-2 rounded-xl border p-4 hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="codigo-expediente font-medium text-foreground">
                      {[etiquetaCai(f.informe.cai), f.informe.no_nombramiento].filter(Boolean).join(" · ")}
                    </span>{" "}
                    · {f.informe.dependencia_auditada}
                  </p>
                  {/* Único indicador de color: el estado ACTUAL de la recomendación. */}
                  <SemaforoChip
                    tono={ESTADO_RECOMENDACION_TONO[f.recomendacion.estado_actual]}
                    label={ESTADO_RECOMENDACION_LABELS[f.recomendacion.estado_actual]}
                  />
                </div>
                <p className="text-sm font-medium">
                  Def. {f.deficiencia.numero} · {f.deficiencia.titulo}
                </p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{f.recomendacion.texto}</p>
                <p className="text-xs">
                  {f.evaluacion ? (
                    <>
                      <span className="font-medium">Resultado en este seguimiento:</span>{" "}
                      {ESTADO_RECOMENDACION_LABELS[f.evaluacion.estado]} (seguimiento no. {f.evaluacion.numero_seguimiento} de
                      la recomendación)
                      {f.evaluacion.comentario_auditoria ? ` — ${f.evaluacion.comentario_auditoria}` : ""}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Por evaluar en este seguimiento →</span>
                  )}
                </p>
              </Link>
            ))}
            <p className="rounded-xl border bg-muted/30 p-4 text-sm">
              <span className="font-medium">Total evaluado:</span>{" "}
              {COLUMNAS_ESTADO.map((e) => `${totales[e]} ${ESTADO_RECOMENDACION_LABELS[e].toLowerCase()}`).join(" · ")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
