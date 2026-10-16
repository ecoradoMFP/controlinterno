import Link from "next/link";
import { redirect } from "next/navigation";
import { hoyGuatemala } from "@/lib/recomendaciones";
import { BackLink } from "@/components/nav/back-link";
import { PermisoForm, type PersonaOpcion } from "@/components/permisos/permiso-form";
import { TIPO_PERMISO_LABELS, formatearFechaPermiso, formatearHora, formatearMinutos } from "@/lib/permisos";
import { accesoPermisos, cargarPersonal, ORDEN_GRUPOS } from "../datos";

export default async function RegistrarPermisoPage() {
  const { supabase, registra } = await accesoPermisos();
  if (!registra) redirect("/permisos");

  const [{ personal, grupoDe }, { data: recientes }] = await Promise.all([
    cargarPersonal(supabase),
    supabase
      .from("permisos_personal")
      .select("id, fecha, tipo, hora_inicio, hora_fin, motivo, minutos, persona:usuarios!permisos_personal_usuario_nit_fkey(nit, nombre)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const personas: PersonaOpcion[] = personal
    .map((p) => ({ nit: p.nit, nombre: p.nombre, departamento: grupoDe.get(p.nit)! }))
    .sort((a, b) => ORDEN_GRUPOS.indexOf(a.departamento) - ORDEN_GRUPOS.indexOf(b.departamento));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <BackLink href="/permisos" label="Volver a Permisos" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">Registrar un permiso</h1>
        <p className="text-sm text-muted-foreground">Elija a la persona y el tipo de permiso; los campos cambian según el tipo.</p>
      </div>

      <section className="tarjeta p-5">
        <PermisoForm personas={personas} hoy={hoyGuatemala()} />
      </section>

      {recientes && recientes.length > 0 ? (
        <section className="tarjeta">
          <h2 className="border-b px-5 py-3 font-semibold">Lo último que se registró</h2>
          <ul className="divide-y">
            {recientes.map((r) => (
              <li key={r.id} className="flex flex-col gap-0.5 px-5 py-3 text-sm">
                <Link href={`/permisos/${encodeURIComponent(r.persona?.nit ?? "")}`} className="font-medium text-primary hover:underline">
                  {r.persona?.nombre}
                </Link>
                <span className="text-muted-foreground">
                  {formatearFechaPermiso(r.fecha)} · {TIPO_PERMISO_LABELS[r.tipo]}
                  {r.hora_inicio ? ` · ${formatearHora(r.hora_inicio)} a ${formatearHora(r.hora_fin)} (${formatearMinutos(r.minutos ?? 0)} h)` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
