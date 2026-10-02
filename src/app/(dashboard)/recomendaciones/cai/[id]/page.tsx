import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { departamentosParaNombrarSeguimiento, getUsuarioActual, puedeDarSeguimiento, puedeEscribir } from "@/lib/auth";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilasRecomendacion } from "@/components/recomendaciones/lista-recomendaciones";
import { PanelSeguimientoCai } from "@/components/recomendaciones/panel-seguimiento-cai";
import { etiquetaCai } from "@/lib/recomendaciones";
import { cargarCedulaDocumento, cargarRecomendaciones } from "@/lib/recomendaciones-datos";

const SECCIONES = [
  { bucket: "activa", titulo: "Activas" },
  { bucket: "en_seguimiento", titulo: "En seguimiento este año" },
  { bucket: "atendida", titulo: "Atendidas" },
] as const;

/**
 * Entrada por CAI: sus recomendaciones y, si hay un nombramiento de seguimiento en curso, el panel
 * para registrar el seguimiento de todo el CAI sin salir de aquí.
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
    .select("id, cai, no_nombramiento, dependencia_auditada, tipo_auditoria, departamento_id, departamentos(nombre)")
    .eq("id", id)
    .maybeSingle();
  // RLS decide la visibilidad: sin fila, es un 404.
  if (!informe) notFound();

  const [todas, { data: cobertura }, gestionables, puedeDar] = await Promise.all([
    cargarRecomendaciones(supabase),
    supabase
      .from("documentos_seguimiento_informes")
      .select("documentos_seguimiento(id, no_nombramiento, fecha_nombramiento, no_documento, tipo_documento)")
      .eq("informe_id", id),
    departamentosParaNombrarSeguimiento(usuario, supabase),
    puedeDarSeguimiento(usuario, id, supabase),
  ]);
  const filas = todas.filter((f) => f.informe.id === id);
  const puedeNombrar = gestionables.includes(informe.departamento_id);

  // Nombramiento sin emitir que cubre este CAI (la emisión cierra la cédula): el más antiguo.
  const enCurso = (cobertura ?? [])
    .flatMap((c) => (c.documentos_seguimiento ? [c.documentos_seguimiento] : []))
    .filter((d) => !d.no_documento)
    .sort((a, b) => (a.fecha_nombramiento ?? "").localeCompare(b.fecha_nombramiento ?? ""))[0];

  const cedula = enCurso ? await cargarCedulaDocumento(supabase, enCurso.id) : null;
  const filasPanel = cedula?.filas.filter((f) => f.informe.id === id) ?? [];
  const puedeRegistrar = puedeEscribir(usuario) && puedeDar && !!enCurso;

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/recomendaciones" label="Volver a la bandeja de recomendaciones" />

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="codigo-expediente text-xl">{etiquetaCai(informe.cai) ?? informe.no_nombramiento}</CardTitle>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:gap-10">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Dependencia auditada</p>
              <p>{informe.dependencia_auditada}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tipo de auditoría</p>
              <p>{informe.tipo_auditoria ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Nombramiento</p>
              <p className="codigo-expediente">{informe.no_nombramiento ?? "—"}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href={`/recomendaciones/informes/${id}`} />}>
            Ver informe completo
          </Button>
          {enCurso ? (
            <Button variant="outline" render={<Link href={`/recomendaciones/documentos/${enCurso.id}`} />}>
              Ver nombramiento de seguimiento
            </Button>
          ) : puedeNombrar ? (
            <Button render={<Link href={`/recomendaciones/documentos/nuevo?informe=${id}`} />}>Nombramiento emitido</Button>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {enCurso ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Dar seguimiento</h2>
          {filasPanel.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este CAI no tiene recomendaciones abiertas que evaluar.</p>
          ) : (
            <PanelSeguimientoCai
              documentoId={enCurso.id}
              filas={filasPanel}
              puedeRegistrar={puedeRegistrar}
              volverA={`/recomendaciones/cai/${id}`}
            />
          )}
        </section>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Para dar seguimiento a este CAI primero debe emitirse un nombramiento de seguimiento que lo cubra.
        </p>
      )}

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
