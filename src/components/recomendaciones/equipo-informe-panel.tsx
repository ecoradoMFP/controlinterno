import { agregarMiembroEquipoInforme, eliminarMiembroEquipoInforme } from "@/app/(dashboard)/recomendaciones/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARGO_LABELS, type InformeAuditoriaEquipo, type Usuario } from "@/types/domain";

export function EquipoInformePanel({
  informeId,
  equipo,
  candidatos,
  puedeEditar,
}: {
  informeId: string;
  equipo: (InformeAuditoriaEquipo & { usuarios: Pick<Usuario, "nombre" | "cargo" | "puesto"> | null })[];
  candidatos: Usuario[];
  puedeEditar: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y rounded-lg border">
        {equipo.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">Sin auditores asignados aún.</li>
        ) : (
          equipo.map((m) => (
            <li key={m.usuario_nit} className="flex items-center justify-between gap-2 p-3 text-sm">
              <span>
                {m.usuarios?.nombre ?? m.usuario_nit}
                {m.usuarios?.cargo ? ` · ${CARGO_LABELS[m.usuarios.cargo]}` : ""}
              </span>
              {puedeEditar ? (
                <form action={eliminarMiembroEquipoInforme}>
                  <input type="hidden" name="informe_id" value={informeId} />
                  <input type="hidden" name="usuario_nit" value={m.usuario_nit} />
                  <Button type="submit" variant="ghost" size="sm">
                    Quitar
                  </Button>
                </form>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {puedeEditar ? (
        <form action={agregarMiembroEquipoInforme} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="informe_id" value={informeId} />
          <div className="flex min-w-56 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Auditor</label>
            {candidatos.length === 1 ? (
              // Mismo bug de Base UI con un solo candidato — ver equipo-panel.tsx de actividades.
              <>
                <Input value={`${candidatos[0].nombre} — ${candidatos[0].puesto ?? candidatos[0].cargo}`} disabled />
                <input type="hidden" name="usuario_nit" value={candidatos[0].nit} />
              </>
            ) : (
              <Select
                name="usuario_nit"
                required
                items={Object.fromEntries(candidatos.map((u) => [u.nit, `${u.nombre} — ${u.puesto ?? u.cargo}`]))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un auditor" />
                </SelectTrigger>
                <SelectContent>
                  {candidatos.map((u) => (
                    <SelectItem key={u.nit} value={u.nit}>
                      {u.nombre} — {u.puesto ?? u.cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button type="submit">Agregar</Button>
        </form>
      ) : null}
    </div>
  );
}
