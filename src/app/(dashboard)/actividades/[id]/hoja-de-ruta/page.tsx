import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/actividades/print-button";
import { FlujogramaDocumento } from "@/components/actividades/flujograma-documento";
import {
  CARGO_LABELS,
  ETAPA_ACTIVIDAD_LABELS,
  FASE_DOCUMENTO_LABELS,
  TIPO_EVENTO_LABELS,
  type Movimiento,
} from "@/types/domain";

type MovimientoConAutor = Movimiento & { registrado_por: { nombre: string } | null };

export default async function HojaDeRutaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ documento?: string }>;
}) {
  const { id } = await params;
  const { documento: documentoId } = await searchParams;

  const supabase = await createClient();

  // Mismo patrón que la vista de detalle: RLS ya decide qué actividad es visible, así que
  // "no vino nada" es un 404 legítimo, no un caso a manejar aparte.
  const { data: actividad } = await supabase
    .from("actividades")
    .select(
      "*, departamentos(nombre), auditor_principal:usuarios!actividades_auditor_principal_nit_fkey(nombre, puesto)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!actividad) notFound();

  const { data: documentos } = await supabase
    .from("documentos_actividad")
    .select("*, documentos_catalogo(nombre, etapa), movimientos(*, registrado_por:usuarios(nombre))")
    .eq("actividad_id", id)
    .order("created_at");

  let documentosAMostrar = documentos ?? [];
  if (documentoId) {
    documentosAMostrar = documentosAMostrar.filter((d) => d.id === documentoId);
    // Un id de documento que no aparece entre los de esta actividad (ya filtrada por RLS) es
    // exactamente el mismo caso que una actividad inexistente/fuera de alcance: 404.
    if (documentosAMostrar.length === 0) notFound();
  }

  const fechaGeneracion = new Date().toLocaleString("es-GT", { dateStyle: "long", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" render={<Link href={`/actividades/${id}`} />}>
          Volver a la actividad
        </Button>
        <PrintButton />
      </div>

      <div className="hidden flex-col items-center gap-1 border-b pb-4 text-center print:flex">
        <p className="text-xs font-semibold tracking-wider uppercase">Ministerio de Finanzas Públicas</p>
        <p className="text-xs text-muted-foreground">Dirección de Auditoría Interna</p>
        <h1 className="mt-2 font-heading text-lg font-semibold">
          {documentoId ? "Hoja de ruta del documento" : "Hoja de ruta del expediente"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="codigo-expediente text-lg">{actividad.no_nombramiento}</CardTitle>
              <p className="text-sm text-muted-foreground">{actividad.dependencia_auditada}</p>
            </div>
            <Badge variant="secondary">{ETAPA_ACTIVIDAD_LABELS[actividad.etapa_actual]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
          <Info label="Departamento" value={actividad.departamentos?.nombre} />
          <Info label="Auditor principal" value={actividad.auditor_principal?.nombre} />
          <Info label="Tipo de auditoría" value={actividad.tipo_auditoria} />
          <Info label="Notificación" value={actividad.fecha_notificacion} />
        </CardContent>
      </Card>

      {documentosAMostrar.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ningún documento del catálogo iniciado todavía.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {documentosAMostrar.map((d) => {
            const movimientos = (d.movimientos as unknown as MovimientoConAutor[])
              .slice()
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            return (
              <div key={d.id} className="break-inside-avoid rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-medium">{d.documentos_catalogo?.nombre ?? "Documento"}</p>
                  <Badge variant={d.fase_actual === "finalizado" ? "default" : "secondary"}>
                    {FASE_DOCUMENTO_LABELS[d.fase_actual]}
                  </Badge>
                </div>

                {movimientos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
                ) : (
                  <>
                    <FlujogramaDocumento movimientos={movimientos} />
                    <ol className="mt-3 flex flex-col gap-3 border-l pl-4">
                    {movimientos.map((m) => (
                      <li key={m.id} className="text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{TIPO_EVENTO_LABELS[m.tipo_evento]}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(m.timestamp).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {m.de_cargo ? `${CARGO_LABELS[m.de_cargo]} → ${CARGO_LABELS[m.a_cargo]}` : `A ${CARGO_LABELS[m.a_cargo]}`}
                          {" · registrado por "}
                          {m.registrado_por?.nombre ?? m.registrado_por_nit}
                        </p>
                        {m.observacion ? <p className="mt-1 italic">&ldquo;{m.observacion}&rdquo;</p> : null}
                        {m.es_correccion_direccion ? (
                          <Badge variant="destructive" className="mt-2">
                            Corrección de Dirección
                          </Badge>
                        ) : null}
                      </li>
                    ))}
                    </ol>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="hidden text-center text-xs text-muted-foreground print:block">
        Generado el {fechaGeneracion} desde el Sistema de Trazabilidad Documental — DAI/MINFIN.
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value ?? "—"}</p>
    </div>
  );
}
