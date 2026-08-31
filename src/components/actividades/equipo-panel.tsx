import { agregarMiembroEquipo } from "@/app/(dashboard)/actividades/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARGO_LABELS, type ActividadEquipo, type Usuario } from "@/types/domain";

export function EquipoPanel({
  actividadId,
  equipo,
  candidatos,
  puedeEditar,
}: {
  actividadId: string;
  equipo: (ActividadEquipo & { usuarios: Pick<Usuario, "nombre" | "cargo" | "puesto"> | null })[];
  candidatos: Usuario[];
  puedeEditar: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y rounded-lg border">
        {equipo.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">Sin miembros de equipo asignados aún.</li>
        ) : (
          equipo.map((m) => (
            <li key={m.usuario_nit} className="flex items-center justify-between p-3 text-sm">
              <span>
                {m.usuarios?.nombre ?? m.usuario_nit}
                {m.usuarios?.cargo ? ` · ${CARGO_LABELS[m.usuarios.cargo]}` : ""}
              </span>
              <span className="text-muted-foreground">{m.rol_en_equipo ?? "—"}</span>
            </li>
          ))
        )}
      </ul>

      {puedeEditar ? (
        <form action={agregarMiembroEquipo} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="actividad_id" value={actividadId} />
          <div className="flex min-w-56 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Usuario</label>
            <Select
              name="usuario_nit"
              required
              items={Object.fromEntries(candidatos.map((u) => [u.nit, `${u.nombre} — ${u.puesto ?? u.cargo}`]))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un usuario" />
              </SelectTrigger>
              <SelectContent>
                {candidatos.map((u) => (
                  <SelectItem key={u.nit} value={u.nit}>
                    {u.nombre} — {u.puesto ?? u.cargo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-40 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Rol en el equipo (opcional)</label>
            <Input name="rol_en_equipo" placeholder="Apoyo, muestreo, ..." />
          </div>
          <Button type="submit">Agregar</Button>
        </form>
      ) : null}
    </div>
  );
}
