import { createClient } from "@/lib/supabase/server";
import { BotonAccion, FormAccion } from "@/components/form-accion";
import { asignarEncargado, quitarEncargado } from "@/app/(dashboard)/permisos/actions";

const SELECT_CLASES = "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm";

export async function EncargadosPermisos() {
  const supabase = await createClient();
  const [{ data: encargados }, { data: personas }] = await Promise.all([
    supabase
      .from("permisos_encargados")
      .select("usuario_nit, created_at, persona:usuarios!permisos_encargados_usuario_nit_fkey(nombre, puesto), asignado_por:usuarios!permisos_encargados_asignado_por_nit_fkey(nombre)")
      .order("created_at"),
    supabase.from("usuarios").select("nit, nombre").eq("activo", true).neq("permiso_sistema", "consulta").order("nombre"),
  ]);
  const yaAsignados = new Set((encargados ?? []).map((e) => e.usuario_nit));

  return (
    <div className="tarjeta">
      <div className="border-b p-4">
        <h2 className="font-medium">Control de permisos y llegadas tarde</h2>
        <p className="text-xs text-muted-foreground">
          Personas encargadas de registrar los permisos de toda la Dirección. Dirección con control total también puede registrarlos.
        </p>
      </div>
      <ul className="divide-y">
        {(encargados ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">Todavía no hay nadie asignado.</li>
        ) : (
          (encargados ?? []).map((e) => (
            <li key={e.usuario_nit} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">{e.persona?.nombre ?? e.usuario_nit}</p>
                <p className="text-xs text-muted-foreground">
                  {e.persona?.puesto ? `${e.persona.puesto} · ` : ""}Asignada por {e.asignado_por?.nombre}
                </p>
              </div>
              <FormAccion action={quitarEncargado}>
                <input type="hidden" name="usuario_nit" value={e.usuario_nit} />
                <BotonAccion variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  Quitar
                </BotonAccion>
              </FormAccion>
            </li>
          ))
        )}
      </ul>
      <FormAccion action={asignarEncargado} className="flex flex-wrap items-end gap-3 border-t p-4">
        <div className="flex min-w-72 flex-col gap-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="encargado_nit">
            Persona
          </label>
          <select id="encargado_nit" name="usuario_nit" required defaultValue="" className={SELECT_CLASES}>
            <option value="" disabled>
              Seleccione
            </option>
            {(personas ?? [])
              .filter((p) => !yaAsignados.has(p.nit))
              .map((p) => (
                <option key={p.nit} value={p.nit}>
                  {p.nombre}
                </option>
              ))}
          </select>
        </div>
        <BotonAccion variant="outline">Asignar como encargada</BotonAccion>
      </FormAccion>
    </div>
  );
}
