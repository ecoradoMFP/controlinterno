import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeRegistrarCargoTemporal } from "@/lib/auth";
import { hoyGuatemala } from "@/lib/recomendaciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CARGO_LABELS } from "@/types/domain";
import { registrarCargoTemporal, revocarCargoTemporal } from "./actions";

const SELECT_CLASES = "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm";

/**
 * Ampliaciones de nombramiento: alguien cubre por un período el puesto de Subjefe o Jefe de un
 * departamento. Mientras está vigente, el sistema le da los permisos de ese
 * cargo (`authz.usuario_actual`); al terminar, vuelve solo a su cargo de siempre.
 */
export default async function CargosTemporalesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const usuario = await getUsuarioActual();
  if (!usuario || !puedeRegistrarCargoTemporal(usuario)) redirect("/actividades");

  const supabase = await createClient();
  const [{ data: registros }, { data: personas }, { data: departamentos }] = await Promise.all([
    supabase
      .from("cargos_temporales")
      .select(
        "*, persona:usuarios!cargos_temporales_usuario_nit_fkey(nombre, cargo), departamentos(nombre), registrado_por:usuarios!cargos_temporales_registrado_por_nit_fkey(nombre), revocado_por:usuarios!cargos_temporales_revocado_por_nit_fkey(nombre)",
      )
      .order("fecha_inicio", { ascending: false }),
    supabase.from("usuarios").select("nit, nombre, cargo, departamento_id").eq("activo", true).order("nombre"),
    supabase.from("departamentos").select("id, nombre").order("nombre"),
  ]);

  const hoy = hoyGuatemala();
  const estado = (r: NonNullable<typeof registros>[number]) =>
    r.revocado_en ? "terminado" : r.fecha_fin < hoy ? "vencido" : r.fecha_inicio > hoy ? "programado" : "vigente";
  const activos = (registros ?? []).filter((r) => ["vigente", "programado"].includes(estado(r)));
  const historial = (registros ?? []).filter((r) => !["vigente", "programado"].includes(estado(r)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Cargos temporales</h1>
        <p className="text-sm text-muted-foreground">
          Ampliaciones de nombramiento: quién cubre el puesto de Subjefe o Jefe de un departamento y por cuánto
          tiempo. Mientras está vigente tiene los permisos de ese cargo; al terminar vuelve a su cargo de siempre.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Vigentes y programados ({activos.length})</h2>
        {activos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nadie está cubriendo un cargo temporal ahora.</p>
        ) : (
          activos.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {r.persona?.nombre ?? r.usuario_nit} — {CARGO_LABELS[r.cargo]} de {r.departamentos?.nombre}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Del {r.fecha_inicio} al {r.fecha_fin} · {r.documento_respaldo}
                    {r.persona?.cargo ? ` · Su cargo de siempre: ${CARGO_LABELS[r.persona.cargo]}` : ""}
                  </p>
                  <p className="mt-1 text-sm">Motivo: {r.motivo}</p>
                  <p className="text-xs text-muted-foreground">Registrado por {r.registrado_por?.nombre ?? r.registrado_por_nit}</p>
                </div>
                <span
                  className={
                    estado(r) === "vigente"
                      ? "rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {estado(r) === "vigente" ? "Vigente" : "Programado"}
                </span>
              </div>
              <details className="rounded-lg border bg-muted/30 p-3">
                <summary className="cursor-pointer text-sm font-medium">Terminarlo antes de la fecha</summary>
                <form action={revocarCargoTemporal} className="mt-3 flex flex-col gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="text-xs text-muted-foreground" htmlFor={`motivo-${r.id}`}>
                    Motivo (obligatorio, queda en el historial)
                  </label>
                  <Textarea id={`motivo-${r.id}`} name="motivo_revocacion" rows={2} required minLength={10} />
                  <Button type="submit" variant="outline" size="sm" className="w-fit">
                    Terminar cargo temporal
                  </Button>
                </form>
              </details>
            </div>
          ))
        )}
      </section>

      <form action={registrarCargoTemporal} className="flex flex-col gap-4 rounded-xl border border-dashed p-4">
        <h2 className="font-medium">Registrar una ampliación de nombramiento</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="usuario_nit">Persona que cubre el puesto</label>
            <select id="usuario_nit" name="usuario_nit" required defaultValue="" className={SELECT_CLASES}>
              <option value="" disabled>Selecciona</option>
              {(personas ?? []).map((p) => (
                <option key={p.nit} value={p.nit}>
                  {p.nombre}
                  {p.cargo ? ` (${CARGO_LABELS[p.cargo]})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="cargo">Cargo que cubre</label>
            <select id="cargo" name="cargo" required defaultValue="" className={SELECT_CLASES}>
              <option value="" disabled>Selecciona</option>
              <option value="subjefe">{CARGO_LABELS.subjefe}</option>
              <option value="jefe">{CARGO_LABELS.jefe}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="departamento_id">Departamento</label>
            <select id="departamento_id" name="departamento_id" required defaultValue="" className={SELECT_CLASES}>
              <option value="" disabled>Selecciona</option>
              {(departamentos ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="documento_respaldo">No. de la ampliación de nombramiento</label>
            <Input id="documento_respaldo" name="documento_respaldo" required placeholder="Ej. DAI-AMP-003-2026" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="fecha_inicio">Desde</label>
            <Input id="fecha_inicio" name="fecha_inicio" type="date" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="fecha_fin">Hasta (inclusive)</label>
            <Input id="fecha_fin" name="fecha_fin" type="date" required />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="motivo">Motivo</label>
          <Textarea id="motivo" name="motivo" rows={2} required minLength={10} placeholder="Ej. Vacaciones del Jefe titular" />
        </div>
        <Button type="submit" className="w-fit">Registrar cargo temporal</Button>
      </form>

      {historial.length > 0 ? (
        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">Historial ({historial.length})</summary>
          <ul className="mt-3 flex flex-col gap-3 text-sm">
            {historial.map((r) => (
              <li key={r.id} className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium">
                  {r.persona?.nombre ?? r.usuario_nit} — {CARGO_LABELS[r.cargo]} de {r.departamentos?.nombre}
                </p>
                <p className="text-muted-foreground">
                  Del {r.fecha_inicio} al {r.fecha_fin} · {r.documento_respaldo} · Motivo: {r.motivo}
                </p>
                {r.revocado_en ? (
                  <p className="text-muted-foreground">
                    Terminado antes por {r.revocado_por?.nombre ?? r.revocado_por_nit} el{" "}
                    {new Date(r.revocado_en).toLocaleDateString("es-GT", { timeZone: "America/Guatemala" })}: {r.motivo_revocacion}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Concluyó en la fecha prevista.</p>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
