import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { departamentosParaNombrarSeguimiento, getUsuarioActual, puedeDarSeguimiento, puedeEscribir } from "@/lib/auth";
import { registrarCargaSagUdai, registrarDocumentoEmitido } from "@/app/(dashboard)/recomendaciones/actions";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FilasRecomendacion } from "@/components/recomendaciones/lista-recomendaciones";
import { PanelSeguimientoCai } from "@/components/recomendaciones/panel-seguimiento-cai";
import { PasosCiclo, type PasoCiclo } from "@/components/recomendaciones/pasos-ciclo";
import { etiquetaCai, pasoDelCai, type PasoCai } from "@/lib/recomendaciones";
import { cargarCedulaDocumento, cargarDocumentosSeguimiento, cargarFlujoPorCai, cargarRecomendaciones } from "@/lib/recomendaciones-datos";

const SECCIONES = [
  { bucket: "activa", titulo: "Activas" },
  { bucket: "en_seguimiento", titulo: "En seguimiento este año" },
  { bucket: "atendida", titulo: "Atendidas" },
] as const;

const TITULO_PASO: Record<PasoCai, string> = {
  capturar: "Capturar las deficiencias y sus recomendaciones",
  nombramiento: "Registrar el nombramiento de seguimiento",
  evaluar: "Registrar el seguimiento de las recomendaciones",
  emitir: "Emitir el informe de seguimiento",
  sag: "Cargar el informe al SAG-UDAI",
  al_dia: "Este CAI está al día",
};

/**
 * Centro de cada CAI: ve en qué paso va su seguimiento y hace ese paso aquí mismo (nombramiento,
 * seguimiento, emisión del informe y carga al SAG-UDAI), sin saltar entre pantallas.
 */
export default async function CaiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  const { data: informe } = await supabase
    .from("informes_auditoria")
    .select("id, cai, no_nombramiento, dependencia_auditada, tipo_auditoria, departamento_id, bloqueado_en, departamentos(nombre)")
    .eq("id", id)
    .maybeSingle();
  // RLS decide la visibilidad: sin fila, es un 404.
  if (!informe) notFound();

  const [todas, documentosTodos, gestionables, puedeDar] = await Promise.all([
    cargarRecomendaciones(supabase),
    cargarDocumentosSeguimiento(supabase),
    departamentosParaNombrarSeguimiento(usuario, supabase),
    puedeDarSeguimiento(usuario, id, supabase),
  ]);
  const filas = todas.filter((f) => f.informe.id === id);
  const flujo = (await cargarFlujoPorCai(supabase, filas)).get(id);
  const paso: PasoCai =
    flujo?.paso ?? pasoDelCai({ tieneRecomendaciones: false, hayActivas: false, pasoDocumento: null });
  const cedula = flujo?.documentoId ? await cargarCedulaDocumento(supabase, flujo.documentoId) : null;
  const documento = cedula?.documento ?? null;

  // Informes de seguimiento de este CAI ya completos (emitidos y cargados al SAG-UDAI).
  const anteriores = documentosTodos
    .filter((d) => d.paso === "completo" && d.informes.some((i) => i.id === id))
    .sort((a, b) => (b.fecha_documento ?? "").localeCompare(a.fecha_documento ?? ""));

  const puedeNombrar = gestionables.includes(informe.departamento_id);
  const esDirector = puedeEscribir(usuario) && usuario?.cargo === "director";
  const esAuditorNombrado = !!documento?.documentos_seguimiento_auditores.some((a) => a.usuario_nit === usuario?.nit);
  const puedeGestionar =
    puedeEscribir(usuario) && !!documento && (esAuditorNombrado || gestionables.includes(documento.departamento_id));
  const puedeRegistrar = puedeEscribir(usuario) && puedeDar && paso === "evaluar";
  const filasPanel = cedula?.filas.filter((f) => f.informe.id === id) ?? [];
  const volverA = `/recomendaciones/cai/${id}`;

  const alDia = paso === "al_dia";
  const idx = { capturar: 0, nombramiento: 1, evaluar: 2, emitir: 3, sag: 4, al_dia: 5 }[paso];
  const estado = (n: number): PasoCiclo["estado"] => (alDia || n < idx ? "hecho" : n === idx ? "actual" : "pendiente");
  const pasos: PasoCiclo[] = [
    { titulo: "Recomendaciones capturadas", detalle: `${filas.length} recomendación(es)`, estado: estado(0) },
    { titulo: "Nombrar auditor", detalle: documento?.no_nombramiento ?? "Nombramiento de seguimiento", estado: estado(1) },
    { titulo: "Evaluar recomendaciones", detalle: "Estado de cada una", estado: estado(2) },
    { titulo: "Emitir informe", detalle: documento?.no_documento ?? "Número y fecha", estado: estado(3) },
    { titulo: "Cargar al SAG-UDAI", detalle: "Lo registra el Director", estado: estado(4) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/recomendaciones" label="Volver a la bandeja de recomendaciones" />

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="codigo-expediente text-xl">{etiquetaCai(informe.cai) ?? informe.no_nombramiento}</CardTitle>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:gap-10">
            <Dato titulo="Dependencia auditada" valor={informe.dependencia_auditada} />
            <Dato titulo="Tipo de auditoría" valor={informe.tipo_auditoria} />
            <Dato titulo="Nombramiento" valor={informe.no_nombramiento} mono />
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href={`/recomendaciones/informes/${id}`} />}>
            {informe.bloqueado_en ? "Ver el informe (captura bloqueada)" : "Ver o editar el informe"}
          </Button>
          {documento ? (
            <Button variant="outline" render={<a href={`/recomendaciones/documentos/${documento.id}/cedula`} download />}>
              Descargar la cédula en Word
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <PasosCiclo pasos={pasos} />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card id="siguiente-paso" className={alDia ? "" : "scroll-mt-4 border-primary/40"}>
        <CardHeader className="gap-1">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">{alDia ? "Estado" : "Siguiente paso"}</p>
          <CardTitle className="text-base">{TITULO_PASO[paso]}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          {paso === "capturar" ? (
            <>
              <p>Este CAI todavía no tiene recomendaciones. Captura cada deficiencia junto con su recomendación.</p>
              <Button size="lg" className="w-fit" render={<Link href={`/recomendaciones/informes/${id}`} />}>
                Capturar deficiencias y recomendaciones
              </Button>
            </>
          ) : null}

          {paso === "nombramiento" ? (
            puedeNombrar ? (
              <>
                <p>
                  Este CAI tiene {filas.filter((f) => f.bucket === "activa").length} recomendación(es) activa(s). Registra el
                  nombramiento del auditor que les dará seguimiento.
                </p>
                <Button size="lg" className="w-fit" render={<Link href={`/recomendaciones/documentos/nuevo?informe=${id}`} />}>
                  Registrar nombramiento
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">La jefatura debe registrar el nombramiento del auditor que dará seguimiento.</p>
            )
          ) : null}

          {paso === "evaluar" ? (
            filasPanel.length === 0 ? (
              <p className="text-muted-foreground">Este CAI no tiene recomendaciones abiertas que evaluar.</p>
            ) : (
              <PanelSeguimientoCai documentoId={documento!.id} filas={filasPanel} puedeRegistrar={puedeRegistrar} volverA={volverA} />
            )
          ) : null}

          {paso === "emitir" && documento ? (
            puedeGestionar ? (
              <>
                <p>Ya están evaluadas todas las recomendaciones. Escribe el número y la fecha del informe firmado.</p>
                <p className="text-xs text-muted-foreground">
                  Al emitirlo se cierra el seguimiento: las cumplidas pasan al histórico y el resto queda en seguimiento el
                  resto del año.
                </p>
                <form action={registrarDocumentoEmitido} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="documento_id" value={documento.id} />
                  <input type="hidden" name="volver_a" value={volverA} />
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
                  <Button type="submit" size="lg">
                    Emitir informe
                  </Button>
                </form>
              </>
            ) : (
              <p className="text-muted-foreground">Lo emite la jefatura o el auditor nombrado.</p>
            )
          ) : null}

          {paso === "sag" && documento ? (
            esDirector ? (
              <>
                <p>El informe {documento.no_documento} ya se emitió. Registra la fecha en que se cargó al SAG-UDAI.</p>
                <form action={registrarCargaSagUdai} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="documento_id" value={documento.id} />
                  <input type="hidden" name="volver_a" value={volverA} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" htmlFor="fecha_carga_sag_udai">
                      Fecha de carga al SAG-UDAI
                    </label>
                    <Input id="fecha_carga_sag_udai" name="fecha_carga_sag_udai" type="date" required />
                  </div>
                  <Button type="submit" size="lg">
                    Registrar carga al SAG-UDAI
                  </Button>
                </form>
              </>
            ) : (
              <p className="text-muted-foreground">
                El informe {documento.no_documento} ya se emitió. Falta que el Director lo cargue al SAG-UDAI y registre la fecha.
              </p>
            )
          ) : null}

          {alDia ? (
            <p className="text-muted-foreground">
              No hay nada pendiente. Si queda alguna recomendación sin cumplir, volverá a la bandeja principal en el próximo
              año.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {anteriores.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Informes de seguimiento anteriores</h2>
          <ul className="flex flex-col gap-2">
            {anteriores.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/recomendaciones/documentos/${d.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm hover:bg-muted/40"
                >
                  <span>
                    <span className="codigo-expediente font-medium">{d.no_documento}</span>
                    {d.fecha_documento ? ` · emitido el ${d.fecha_documento}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {d.auditores.length ? `Auditor(es): ${d.auditores.join(", ")} · ` : ""}Ver la cédula
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Recomendaciones del CAI ({filas.length})</h2>
        {filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este CAI no tiene recomendaciones capturadas.</p>
        ) : (
          SECCIONES.map(({ bucket, titulo }) => {
            const delBucket = filas.filter((f) => f.bucket === bucket);
            if (delBucket.length === 0) return null;
            return (
              <div key={bucket} className="rounded-xl border">
                <h3 className="p-4 pb-3 text-sm font-medium">
                  {titulo} ({delBucket.length})
                </h3>
                <FilasRecomendacion filas={delBucket} contexto={bucket} />
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function Dato({ titulo, valor, mono }: { titulo: string; valor?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      <p className={mono ? "codigo-expediente" : undefined}>{valor ?? "—"}</p>
    </div>
  );
}
