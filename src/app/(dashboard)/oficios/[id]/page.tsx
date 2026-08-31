import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeEscribir } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeguimientoPanel } from "@/components/oficios/seguimiento-panel";
import { ParticipantesPanel } from "@/components/oficios/participantes-panel";

export default async function OficioDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const { id } = await params;
  const { tab = "seguimiento", error } = await searchParams;

  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);

  // Hint explícito en `usuarios`: sin él, PostgREST no puede elegir entre el FK directo
  // (responsable_elaboracion_nit) y los caminos many-to-many vía oficios_revisores/
  // oficios_firmantes, y falla con PGRST201 (mismo caso que actividades/actividades_equipo).
  const { data: oficio } = await supabase
    .from("oficios")
    .select(
      "*, actividades(no_nombramiento), responsable:usuarios!oficios_responsable_elaboracion_nit_fkey(nombre, puesto)",
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

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{oficio.no_oficio}</CardTitle>
          <p className="text-sm text-muted-foreground">{oficio.asunto}</p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
          <Info label="Actividad relacionada" value={oficio.actividades?.no_nombramiento} />
          <Info label="Responsable" value={oficio.responsable?.nombre} />
          <Info label="Destinatario" value={oficio.destinatario} />
          <Info label="Puesto del destinatario" value={oficio.puesto_destinatario} />
          <Info label="Fecha de emisión" value={oficio.fecha_emision} />
          <Info label="Plazo de respuesta" value={oficio.plazo_respuesta_dias ? `${oficio.plazo_respuesta_dias} días` : undefined} />
          <Info label="Fecha de vencimiento" value={oficio.fecha_vencimiento} />
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
          <TabsTrigger value="participantes">Revisores y firmantes</TabsTrigger>
        </TabsList>
        <TabsContent value="seguimiento">
          <SeguimientoPanel oficio={oficio} puedeEditar={puedeEditar} />
        </TabsContent>
        <TabsContent value="participantes">
          <ParticipantesPanel
            oficioId={id}
            revisores={revisores ?? []}
            firmantes={firmantes ?? []}
            candidatosRevisores={candidatosRevisores}
            candidatosFirmantes={candidatosFirmantes}
            puedeEditar={puedeEditar}
          />
        </TabsContent>
      </Tabs>
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
