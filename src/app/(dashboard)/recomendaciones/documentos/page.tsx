import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { departamentosParaNombrarSeguimiento, getUsuarioActual } from "@/lib/auth";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { cargarDocumentosSeguimiento, type PasoDocumento } from "@/lib/recomendaciones-datos";
import { etiquetaCai } from "@/lib/recomendaciones";

type Documento = Awaited<ReturnType<typeof cargarDocumentosSeguimiento>>[number];

// Qué le falta a cada nombramiento, dicho en lenguaje llano y con la acción a la que lleva.
const PASO: Record<PasoDocumento, { accion: string; boton: string }> = {
  evaluar: { accion: "Faltan recomendaciones por evaluar", boton: "Continuar" },
  emitir: { accion: "Ya se evaluó todo: falta emitir el informe", boton: "Emitir informe" },
  sag: { accion: "Informe emitido: falta cargarlo al SAG-UDAI", boton: "Abrir" },
  completo: { accion: "Completo", boton: "Ver" },
};

export default async function NombramientosSeguimientoPage() {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  const [documentos, gestionables] = await Promise.all([
    cargarDocumentosSeguimiento(supabase),
    departamentosParaNombrarSeguimiento(usuario, supabase),
  ]);

  // Lo que pide acción primero (lo más antiguo arriba: es lo que lleva más tiempo esperando).
  const porCompletar = documentos
    .filter((d) => d.paso !== "completo")
    .sort((a, b) => (a.fecha_nombramiento ?? "").localeCompare(b.fecha_nombramiento ?? ""));
  const completos = documentos
    .filter((d) => d.paso === "completo")
    .sort((a, b) => (b.fecha_documento ?? "").localeCompare(a.fecha_documento ?? ""));

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/recomendaciones" label="Volver a la bandeja de recomendaciones" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Nombramientos e informes de seguimiento</h1>
          <p className="text-sm text-muted-foreground">
            Cada nombramiento da seguimiento a un informe de auditoría: se evalúan sus recomendaciones, se emite el informe y
            se carga al SAG-UDAI.
          </p>
        </div>
        {gestionables.length > 0 ? (
          <Button size="lg" render={<Link href="/recomendaciones/documentos/nuevo" />}>
            Emitir nombramiento de seguimiento
          </Button>
        ) : null}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Por completar ({porCompletar.length})</h2>
        {porCompletar.length === 0 ? (
          <p className="rounded-xl border p-4 text-sm text-muted-foreground">
            No hay nombramientos pendientes.
            {gestionables.length > 0 ? " Para iniciar un seguimiento, emite un nombramiento con el botón de arriba." : ""}
          </p>
        ) : (
          porCompletar.map((d) => <TarjetaDocumento key={d.id} d={d} destacado />)
        )}
      </section>

      {completos.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Completos ({completos.length})</h2>
          {completos.map((d) => (
            <TarjetaDocumento key={d.id} d={d} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function TarjetaDocumento({ d, destacado }: { d: Documento; destacado?: boolean }) {
  const paso = PASO[d.paso];
  const titulo = d.no_nombramiento ? `Nombramiento ${d.no_nombramiento}` : `Oficio ${d.no_documento ?? ""}`.trim();
  return (
    <Link
      href={`/recomendaciones/documentos/${d.id}`}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 hover:bg-muted/40"
    >
      <div className="flex min-w-0 flex-col gap-1 text-sm">
        <p className="codigo-expediente font-medium">{titulo}</p>
        <p className="text-muted-foreground">
          {d.informes.map((i) => [etiquetaCai(i.cai), i.dependencia_auditada].filter(Boolean).join(" · ")).join(" | ") ||
            "Sin informe asociado"}
        </p>
        <p className="text-xs text-muted-foreground">
          {[
            d.fecha_nombramiento ? `Nombrado el ${d.fecha_nombramiento}` : null,
            d.auditores.length ? `Auditor(es): ${d.auditores.join(", ")}` : null,
            d.no_documento && d.no_nombramiento ? `Informe ${d.no_documento}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className={destacado ? "font-medium" : "text-muted-foreground"}>
          {destacado ? "Siguiente paso: " : ""}
          {paso.accion}
          {d.paso === "evaluar" && d.porEvaluar > 0 ? ` (${d.porEvaluar})` : ""}
        </p>
      </div>
      <Button variant={destacado ? "default" : "outline"} tabIndex={-1} nativeButton={false} render={<span />}>
        {paso.boton}
      </Button>
    </Link>
  );
}
