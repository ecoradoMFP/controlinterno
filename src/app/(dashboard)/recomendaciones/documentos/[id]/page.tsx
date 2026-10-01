import Link from "next/link";
import { FileDown } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { departamentosParaNombrarSeguimiento, getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { registrarCargaSagUdai, registrarDocumentoEmitido } from "@/app/(dashboard)/recomendaciones/actions";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SemaforoChip } from "@/components/semaforo-chip";
import { PasosCiclo, type PasoCiclo } from "@/components/recomendaciones/pasos-ciclo";
import { etiquetaCai } from "@/lib/recomendaciones";
import { cargarCedulaDocumento } from "@/lib/recomendaciones-datos";
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

  const cedula = await cargarCedulaDocumento(supabase, id);
  if (!cedula) notFound();
  const { documento, filas, emitido } = cedula;

  const porEvaluar = filas.filter((f) => !f.evaluacion).length;
  const totales = Object.fromEntries(
    COLUMNAS_ESTADO.map((e) => [e, filas.filter((f) => f.evaluacion?.estado === e).length]),
  ) as Record<EstadoRecomendacionEnum, number>;

  const esDirector = puedeEscribir(usuario) && usuario?.cargo === "director";
  const esAuditorNombrado = documento.documentos_seguimiento_auditores.some((a) => a.usuario_nit === usuario?.nit);
  const gestionables = await departamentosParaNombrarSeguimiento(usuario, supabase);
  const puedeGestionar = puedeEscribir(usuario) && (esAuditorNombrado || gestionables.includes(documento.departamento_id));

  // Qué pasará con las recomendaciones al emitir: las cumplidas cierran su ciclo (histórico) y el
  // resto queda "en seguimiento" el resto del año. Se lo decimos antes de que emita.
  const evaluadas = filas.filter((f) => f.evaluacion);
  const alHistorico = evaluadas.filter((f) => f.evaluacion?.estado === "cumplida").length;
  const enSeguimiento = evaluadas.length - alHistorico;
  const primeraPorEvaluar = filas.find((f) => !f.evaluacion);
  const cargado = !!documento.fecha_carga_sag_udai;
  const listoParaEmitir = !emitido && porEvaluar === 0 && filas.length > 0;

  const pasos: PasoCiclo[] = [
    {
      titulo: "Nombramiento",
      detalle: documento.no_nombramiento ?? "Registrado",
      estado: "hecho",
    },
    {
      titulo: "Evaluar recomendaciones",
      detalle: emitido ? `${evaluadas.length} evaluada(s)` : `${evaluadas.length} de ${filas.length} evaluadas`,
      estado: emitido || listoParaEmitir ? "hecho" : "actual",
    },
    {
      titulo: "Emitir el informe",
      detalle: documento.no_documento ?? "Registrar número y fecha",
      estado: emitido ? "hecho" : listoParaEmitir ? "actual" : "pendiente",
    },
    {
      titulo: "Cargar al SAG-UDAI",
      detalle: cargado ? `Cargado el ${documento.fecha_carga_sag_udai}` : "Lo registra el Director",
      estado: cargado ? "hecho" : emitido ? "actual" : "pendiente",
    },
  ];

  const formularioEmision = (
    <form action={registrarDocumentoEmitido} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="documento_id" value={documento.id} />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="no_documento">
          Número del informe emitido
        </label>
        <Input id="no_documento" name="no_documento" placeholder="DAI-DAF-SR-CAI-04-2026" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="fecha_documento">
          Fecha del informe
        </label>
        <Input id="fecha_documento" name="fecha_documento" type="date" required />
      </div>
      <Button type="submit" size="lg" variant={listoParaEmitir ? "default" : "outline"}>
        Emitir informe y cerrar el seguimiento
      </Button>
    </form>
  );

  const cais = documento.documentos_seguimiento_informes
    .flatMap((c) => (c.informes_auditoria ? [c.informes_auditoria] : []))
    .map((i) => [etiquetaCai(i.cai), i.no_nombramiento].filter(Boolean).join(" · "));

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/recomendaciones/documentos" label="Volver a nombramientos e informes de seguimiento" />

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

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <PasosCiclo pasos={pasos} />

      <Card className={cn(!emitido || !cargado ? "border-primary/40" : "")}>
        <CardHeader className="gap-1">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Siguiente paso</p>
          <CardTitle className="text-base">
            {!emitido
              ? listoParaEmitir
                ? "Emitir el informe"
                : "Evaluar las recomendaciones que faltan"
              : !cargado
                ? "Cargar el informe al SAG-UDAI"
                : "Seguimiento completo"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          {!emitido && !listoParaEmitir ? (
            <>
              <p>
                {filas.length === 0
                  ? "Los informes cubiertos no tienen recomendaciones abiertas que evaluar."
                  : `Faltan ${porEvaluar} de ${filas.length} recomendaciones por evaluar. Abre cada una y registra su resultado; cuando estén todas, aquí podrás emitir el informe.`}
              </p>
              {primeraPorEvaluar && puedeGestionar ? (
                <Button size="lg" className="w-fit" render={<Link href={`/recomendaciones/${primeraPorEvaluar.recomendacion.id}`} />}>
                  Evaluar la siguiente recomendación
                </Button>
              ) : null}
              {puedeGestionar ? (
                <details className="rounded-lg border p-3">
                  <summary className="cursor-pointer text-muted-foreground">
                    Emitir el informe sin evaluar las {porEvaluar} restantes
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    <p className="text-xs text-muted-foreground">
                      Al emitirlo se cierra la cédula y ya no podrás evaluar estas recomendaciones en este documento.
                    </p>
                    {formularioEmision}
                  </div>
                </details>
              ) : null}
            </>
          ) : null}

          {listoParaEmitir ? (
            puedeGestionar ? (
              <>
                <p>
                  Ya están evaluadas las {filas.length} recomendaciones. Escribe el número y la fecha del informe firmado.
                </p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  <li>La cédula se cierra: ya no se podrán agregar evaluaciones a este documento.</li>
                  {alHistorico > 0 ? <li>{alHistorico} cumplida(s) pasan al histórico.</li> : null}
                  {enSeguimiento > 0 ? <li>{enSeguimiento} sigue(n) en seguimiento el resto del año.</li> : null}
                </ul>
                {formularioEmision}
              </>
            ) : (
              <p className="text-muted-foreground">
                Ya están evaluadas todas las recomendaciones. Lo emite la jefatura o el auditor nombrado.
              </p>
            )
          ) : null}

          {emitido && !cargado ? (
            esDirector ? (
              <form action={registrarCargaSagUdai} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="documento_id" value={documento.id} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="fecha_carga_sag_udai">
                    Fecha en que se cargó al SAG-UDAI
                  </label>
                  <Input id="fecha_carga_sag_udai" name="fecha_carga_sag_udai" type="date" required />
                </div>
                <Button type="submit" size="lg">
                  Registrar carga al SAG-UDAI
                </Button>
              </form>
            ) : (
              <p className="text-muted-foreground">
                El informe ya se emitió. Falta que el Director lo cargue al SAG-UDAI y registre la fecha.
              </p>
            )
          ) : null}

          {emitido && cargado ? (
            <p className="text-muted-foreground">
              El informe {documento.no_documento} se emitió y se cargó al SAG-UDAI. No queda nada pendiente aquí.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-medium">Cédula de seguimiento</h2>
          {filas.length > 0 ? (
            <Button variant="outline" render={<a href={`/recomendaciones/documentos/${documento.id}/cedula`} download />}>
              <FileDown /> Descargar cédula en Word
            </Button>
          ) : null}
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
