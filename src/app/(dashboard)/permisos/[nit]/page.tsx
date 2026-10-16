import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeRegistrarPermisos, veConsolidadoPermisos } from "@/lib/auth";
import { hoyGuatemala } from "@/lib/recomendaciones";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { BotonAccion, FormAccion } from "@/components/form-accion";
import { MatrizMeses } from "@/components/permisos/matriz-meses";
import { PermisoForm } from "@/components/permisos/permiso-form";
import { ResumenTotales } from "@/components/permisos/resumen-totales";
import { eliminarPermiso } from "../actions";
import {
  CATEGORIAS_TIEMPO,
  CATEGORIA_TITULO,
  MESES,
  TIPO_PERMISO_LABELS,
  formatearFechaPermiso,
  formatearHora,
  formatearMinutos,
  minutosPorMes,
  totalesPor,
  totalesVacios,
} from "@/lib/permisos";
import type { TipoPermisoPersonalEnum } from "@/types/domain";

const TONO_TIPO: Record<TipoPermisoPersonalEnum, string> = {
  asunto_personal: "bg-primary/10 text-primary",
  cita_medica: "bg-[var(--status-verde-bg)] text-[var(--status-verde-fg)]",
  entrada_tardia: "bg-[var(--status-naranja-bg)] text-[var(--status-naranja-fg)]",
  comision_oficial: "bg-muted text-muted-foreground",
  nota_marcaje: "bg-muted text-muted-foreground",
};

export default async function PermisosPersonaPage({
  params,
  searchParams,
}: {
  params: Promise<{ nit: string }>;
  searchParams: Promise<{ anio?: string }>;
}) {
  const { nit: nitParam } = await params;
  const nit = decodeURIComponent(nitParam);
  const { anio: anioParam } = await searchParams;
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  if (!usuario) redirect("/login");

  const registra = await puedeRegistrarPermisos(usuario, supabase);
  const consolidado = veConsolidadoPermisos(usuario, registra);
  if (!consolidado && nit !== usuario.nit) redirect(`/permisos/${encodeURIComponent(usuario.nit)}`);

  const hoy = hoyGuatemala();
  const anioActual = Number(hoy.slice(0, 4));
  const anio = Number(anioParam) || anioActual;

  const [{ data: persona }, { data: registros }] = await Promise.all([
    supabase.from("usuarios").select("nit, nombre, puesto, departamentos(nombre)").eq("nit", nit).maybeSingle(),
    supabase
      .from("permisos_personal")
      .select("id, usuario_nit, fecha, tipo, hora_inicio, hora_fin, motivo, minutos, mes, registrado_por:usuarios!permisos_personal_registrado_por_nit_fkey(nombre)")
      .eq("usuario_nit", nit)
      .eq("anio", anio)
      .order("fecha", { ascending: false })
      .order("hora_inicio", { ascending: false }),
  ]);
  if (!persona) notFound();

  const lista = registros ?? [];
  const total = totalesPor(lista, () => 0).get(0) ?? totalesVacios();
  const filasMatriz = CATEGORIAS_TIEMPO.map((c) => ({ clave: c, etiqueta: CATEGORIA_TITULO[c], minutos: minutosPorMes(lista, c) }));
  const meses = [...new Set(lista.map((r) => r.mes!))];
  const propio = nit === usuario.nit;
  const anios = [anioActual, anioActual - 1, anioActual - 2];

  return (
    <div className="flex flex-col gap-6">
      {consolidado ? (
        <div>
          <BackLink href={`/permisos?anio=${anio}`} label="Volver a Permisos" />
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{propio && !consolidado ? "Mis permisos y llegadas tarde" : persona.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {propio && !consolidado ? `${persona.nombre} · ` : ""}
            {persona.departamentos?.nombre ?? "Dirección"}
            {persona.puesto ? ` · ${persona.puesto}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {anios.map((a) => (
            <Button key={a} variant={a === anio ? "default" : "outline"} nativeButton={false} render={<Link href={`/permisos/${encodeURIComponent(nit)}?anio=${a}`} />}>
              {a}
            </Button>
          ))}
        </div>
      </div>

      <ResumenTotales totales={total} periodo={`Todo ${anio}`} />

      {registra ? (
        <details className="tarjeta p-5">
          <summary className="cursor-pointer font-semibold text-primary">Registrar un permiso de {persona.nombre}</summary>
          <div className="mt-4">
            <PermisoForm usuarioNit={nit} hoy={hoy} />
          </div>
        </details>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Detalle · {anio}</h2>
        {lista.length === 0 ? (
          <p className="tarjeta p-5 text-sm text-muted-foreground">No hay registros en {anio}.</p>
        ) : (
          meses.map((m) => (
            <div key={m} className="tarjeta">
              <h3 className="border-b px-5 py-3 font-semibold">{MESES[m - 1]}</h3>
              <ul className="divide-y">
                {lista
                  .filter((r) => r.mes === m)
                  .map((r) => (
                    <li key={r.id} className="flex flex-col gap-2 px-5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="w-32 font-medium">{formatearFechaPermiso(r.fecha)}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONO_TIPO[r.tipo]}`}>{TIPO_PERMISO_LABELS[r.tipo]}</span>
                          {r.motivo !== TIPO_PERMISO_LABELS[r.tipo] ? <span className="text-sm">{r.motivo}</span> : null}
                        </div>
                        <span className="text-sm tabular-nums">
                          {r.hora_inicio ? (
                            <>
                              {formatearHora(r.hora_inicio)} a {formatearHora(r.hora_fin)} ·{" "}
                              <span className="font-semibold">{formatearMinutos(r.minutos ?? 0)} h</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Sin horario</span>
                          )}
                        </span>
                      </div>
                      {registra ? (
                        <div className="flex flex-wrap gap-2">
                          <details className="w-full rounded-lg border bg-muted/30 p-3 open:bg-background sm:w-auto sm:flex-1">
                            <summary className="cursor-pointer text-sm font-medium">Corregir</summary>
                            <div className="mt-3">
                              <PermisoForm key={[r.fecha, r.tipo, r.hora_inicio, r.hora_fin, r.motivo].join("|")} existente={r} hoy={hoy} />
                            </div>
                          </details>
                          <details className="rounded-lg border bg-muted/30 p-3">
                            <summary className="cursor-pointer text-sm font-medium text-destructive">Eliminar</summary>
                            <FormAccion action={eliminarPermiso} className="mt-3 flex flex-col gap-2">
                              <input type="hidden" name="id" value={r.id} />
                              <p className="text-sm">¿Seguro que desea eliminar este registro? Queda constancia en el historial.</p>
                              <BotonAccion variant="destructive" size="sm" className="w-fit">
                                Sí, eliminar
                              </BotonAccion>
                            </FormAccion>
                          </details>
                        </div>
                      ) : null}
                      {registra && r.registrado_por ? (
                        <p className="text-xs text-muted-foreground">Registrado por {r.registrado_por.nombre}</p>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <MatrizMeses titulo={`Resumen por mes · ${anio}`} filas={filasMatriz} etiquetaFila="Tipo" />
    </div>
  );
}
