import { identificadorAuditoria } from "@/lib/auditoria";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeCorregirHechoConsumado, puedeEscribir } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeguimientoOficio } from "@/components/oficios/seguimiento-panel";
import { ParticipantesPanel } from "@/components/oficios/participantes-panel";
import { BackLink } from "@/components/nav/back-link";
import { RutaExpediente } from "@/components/actividades/ruta-expediente";
import { rutaCompletaExpediente } from "@/lib/expediente-digital";

export default async function OficioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  const { data: oficio } = await supabase
    .from("oficios")
    .select(
      "*, actividades(cai, anio_cai, no_nombramiento), responsable:usuarios!oficios_responsable_elaboracion_nit_fkey(nombre, puesto)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!oficio) notFound();

  const [{ data: revisores }, { data: firmantes }, { data: usuarios }] = await Promise.all([
    supabase.from("oficios_revisores").select("usuario_nit, usuarios(nombre, cargo, puesto)").eq("oficio_id", id),
    supabase.from("oficios_firmantes").select("usuario_nit, usuarios(nombre, cargo, puesto)").eq("oficio_id", id),
    supabase.from("usuarios").select("*").eq("activo", true).order("nombre"),
  ]);

  const nitsRevisores = new Set((revisores ?? []).map((r) => r.usuario_nit));
  const nitsFirmantes = new Set((firmantes ?? []).map((f) => f.usuario_nit));
  const candidatosRevisores = (usuarios ?? []).filter((u) => !nitsRevisores.has(u.nit));
  const candidatosFirmantes = (usuarios ?? []).filter((u) => !nitsFirmantes.has(u.nit));

  const puedeEditar = puedeEscribir(usuario);
  const puedeCorregir = puedeCorregirHechoConsumado(usuario);

  const fecha = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : null);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/oficios" label="Volver a Oficios" />

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="codigo-expediente text-xl">{oficio.no_oficio}</CardTitle>
          <p className="text-lg">{oficio.asunto}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-3">
            <Info
              label="Dirigido a"
              value={[oficio.destinatario, oficio.puesto_destinatario].filter(Boolean).join(", ") || null}
            />
            <Info label="Dependencia de destino" value={oficio.dependencia_destino} />
            <Info label="Responsable de elaborarlo" value={oficio.responsable?.nombre} />
            <div>
              <p className="text-sm text-muted-foreground">Auditoría</p>
              {oficio.actividad_id && oficio.actividades ? (
                <Link href={`/actividades/${oficio.actividad_id}`} className="font-medium text-primary underline-offset-2 hover:underline">
                  {identificadorAuditoria(oficio.actividades)}
                </Link>
              ) : (
                <p className="font-medium">Sin auditoría relacionada</p>
              )}
            </div>
            <Info label="Fecha de emisión" value={fecha(oficio.fecha_emision)} />
            <Info
              label="Plazo para responder"
              value={
                oficio.fecha_vencimiento
                  ? `Hasta el ${fecha(oficio.fecha_vencimiento)}${oficio.plazo_respuesta_dias ? ` (${oficio.plazo_respuesta_dias} días)` : ""}`
                  : "Sin plazo"
              }
            />
          </div>
          <RutaExpediente ruta={rutaCompletaExpediente(oficio.ruta_archivo)} etiqueta="Archivo" />
        </CardContent>
      </Card>

      <SeguimientoOficio oficio={oficio} puedeEditar={puedeEditar} puedeCorregir={puedeCorregir} />

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Revisores y firmantes</h2>
        <ParticipantesPanel
          oficioId={id}
          revisores={revisores ?? []}
          firmantes={firmantes ?? []}
          candidatosRevisores={candidatosRevisores}
          candidatosFirmantes={candidatosFirmantes}
          puedeEditar={puedeEditar}
        />
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
