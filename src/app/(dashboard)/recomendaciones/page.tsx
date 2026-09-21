import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SemaforoChip } from "@/components/semaforo-chip";
import { RecomendacionesKpiCards } from "@/components/recomendaciones/kpi-cards";
import { ESTADO_RECOMENDACION_TONO, type EstadoRecomendacionEnum } from "@/types/domain";

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
      .select("id, no_nombramiento, dependencia_auditada, fecha, departamentos(nombre)")
      .order("created_at", { ascending: false }),
    supabase.from("recomendaciones").select("id, estado_actual, deficiencias(informe_id)"),
  ]);

  const conteoPorInforme = new Map<string, Record<EstadoRecomendacionEnum, number>>();
  const totales: Record<EstadoRecomendacionEnum, number> = { pendiente: 0, en_proceso: 0, atendida: 0 };

  for (const r of recomendaciones ?? []) {
    const informeId = r.deficiencias?.informe_id;
    if (!informeId) continue;
    totales[r.estado_actual] += 1;
    const actual = conteoPorInforme.get(informeId) ?? { pendiente: 0, en_proceso: 0, atendida: 0 };
    actual[r.estado_actual] += 1;
    conteoPorInforme.set(informeId, actual);
  }

  const totalRecomendaciones = totales.pendiente + totales.en_proceso + totales.atendida;

  const filas = (informes ?? [])
    .map((i) => ({ informe: i, conteo: conteoPorInforme.get(i.id) ?? { pendiente: 0, en_proceso: 0, atendida: 0 } }))
    .filter((f) => !mostrarSoloPendientes || f.conteo.pendiente + f.conteo.en_proceso > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Seguimiento a recomendaciones</h1>
          <p className="text-sm text-muted-foreground">
            Registro y control de las recomendaciones emitidas por cada informe de auditoría, hasta que quedan
            atendidas.
          </p>
        </div>
        <Button render={<Link href="/recomendaciones/nuevo" />}>Nuevo informe</Button>
      </div>

      <RecomendacionesKpiCards
        totalInformes={informes?.length ?? 0}
        totalRecomendaciones={totalRecomendaciones}
        pendientes={totales.pendiente}
        enProceso={totales.en_proceso}
        atendidas={totales.atendida}
      />

      <div className="rounded-xl border shadow-sm">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-medium">Informes de auditoría</h2>
          <Link
            href={`/recomendaciones?${mostrarSoloPendientes ? "" : "soloPendientes=1"}`}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {mostrarSoloPendientes ? "Ver todos" : "Ver solo con pendientes/en proceso"}
          </Link>
        </div>

        {filas.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Ningún informe capturado todavía.</p>
        ) : (
          <ul className="divide-y">
            {filas.map(({ informe, conteo }) => (
              <li key={informe.id} className="p-4">
                <Link href={`/recomendaciones/${informe.id}`} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="codigo-expediente text-sm font-medium">{informe.no_nombramiento}</p>
                    <p className="text-xs text-muted-foreground">
                      {informe.dependencia_auditada} · {informe.departamentos?.nombre} · {informe.fecha}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {conteo.pendiente > 0 ? (
                      <SemaforoChip tono={ESTADO_RECOMENDACION_TONO.pendiente} label={`${conteo.pendiente} pendiente(s)`} />
                    ) : null}
                    {conteo.en_proceso > 0 ? (
                      <SemaforoChip tono={ESTADO_RECOMENDACION_TONO.en_proceso} label={`${conteo.en_proceso} en proceso`} />
                    ) : null}
                    {conteo.atendida > 0 ? (
                      <SemaforoChip tono={ESTADO_RECOMENDACION_TONO.atendida} label={`${conteo.atendida} atendida(s)`} />
                    ) : null}
                    {conteo.pendiente + conteo.en_proceso + conteo.atendida === 0 ? (
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
