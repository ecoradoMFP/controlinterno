import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SemaforoChip } from "@/components/semaforo-chip";
import { BackLink } from "@/components/nav/back-link";
import {
  ESTADO_RECOMENDACION_LABELS,
  ESTADO_RECOMENDACION_TONO,
  ESTADOS_RECOMENDACION,
  type EstadoRecomendacionEnum,
} from "@/types/domain";

type ConteoEstados = Record<EstadoRecomendacionEnum, number>;

function conteoVacio(): ConteoEstados {
  return { pendiente: 0, en_proceso: 0, no_cumplida: 0, cumplida: 0 };
}

// Todo lo que no está cumplido sigue abierto (no_cumplida admite nuevas rondas de seguimiento).
function abiertas(c: ConteoEstados) {
  return c.pendiente + c.en_proceso + c.no_cumplida;
}

export default async function RecomendacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ soloPendientes?: string }>;
}) {
  const { soloPendientes } = await searchParams;
  const mostrarSoloPendientes = soloPendientes === "1";

  const supabase = await createClient();

  // Sin filtro manual de departamento en ninguna consulta: RLS (informes_auditoria_select,
  // recomendaciones_select) ya devuelve solo lo que está dentro del alcance del usuario actual
  // — mismo criterio que /documentos y /reportes.
  const [{ data: informes }, { data: recomendaciones }] = await Promise.all([
    supabase
      .from("informes_auditoria")
      .select("id, no_nombramiento, cai, dependencia_auditada, fecha_nombramiento, departamentos(nombre)")
      .order("created_at", { ascending: false }),
    supabase.from("recomendaciones").select("id, estado_actual, deficiencias(informe_id)"),
  ]);

  const conteoPorInforme = new Map<string, ConteoEstados>();

  for (const r of recomendaciones ?? []) {
    const informeId = r.deficiencias?.informe_id;
    if (!informeId) continue;
    const actual = conteoPorInforme.get(informeId) ?? conteoVacio();
    actual[r.estado_actual] += 1;
    conteoPorInforme.set(informeId, actual);
  }


  const filas = (informes ?? [])
    .map((i) => ({ informe: i, conteo: conteoPorInforme.get(i.id) ?? conteoVacio() }))
    .filter((f) => !mostrarSoloPendientes || abiertas(f.conteo) > 0);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/recomendaciones" label="Volver a la bandeja de recomendaciones" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Informes de auditoría</h1>
          <p className="text-sm text-muted-foreground">
            Captura de cada informe con sus deficiencias y recomendaciones. El seguimiento se hace desde la bandeja
            de recomendaciones.
          </p>
        </div>
        <Button render={<Link href="/recomendaciones/informes/nuevo" />}>Nuevo informe</Button>
      </div>

      <div className="rounded-xl border shadow-sm">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-medium">Listado</h2>
          <Link
            href={`/recomendaciones/informes?${mostrarSoloPendientes ? "" : "soloPendientes=1"}`}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {mostrarSoloPendientes ? "Ver todos" : "Ver solo con recomendaciones abiertas"}
          </Link>
        </div>

        {filas.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Ningún informe capturado todavía.</p>
        ) : (
          <ul className="divide-y">
            {filas.map(({ informe, conteo }) => (
              <li key={informe.id} className="p-4">
                <Link href={`/recomendaciones/informes/${informe.id}`} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="codigo-expediente text-sm font-medium">{informe.no_nombramiento ?? informe.cai}</p>
                    <p className="text-xs text-muted-foreground">
                      {[informe.dependencia_auditada, informe.departamentos?.nombre, informe.fecha_nombramiento].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ESTADOS_RECOMENDACION.filter((e) => conteo[e] > 0).map((e) => (
                      <SemaforoChip
                        key={e}
                        tono={ESTADO_RECOMENDACION_TONO[e]}
                        label={`${conteo[e]} ${ESTADO_RECOMENDACION_LABELS[e].toLowerCase()}`}
                      />
                    ))}
                    {abiertas(conteo) + conteo.cumplida === 0 ? (
                      <span className="text-xs text-muted-foreground">Sin recomendaciones aún</span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
