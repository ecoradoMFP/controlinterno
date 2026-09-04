import { agregarMiembroEquipo, actualizarConfirmacionEquipo } from "@/app/(dashboard)/actividades/[id]/actions";
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
            <li key={m.usuario_nit} className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span>
                  {m.usuarios?.nombre ?? m.usuario_nit}
                  {m.usuarios?.cargo ? ` · ${CARGO_LABELS[m.usuarios.cargo]}` : ""}
                </span>
                <span className="ml-2 text-muted-foreground">{m.rol_en_equipo ?? "—"}</span>
              </div>
              <ConfirmacionEquipo actividadId={actividadId} miembro={m} puedeEditar={puedeEditar} />
            </li>
          ))
        )}
      </ul>

      {puedeEditar ? (
        <form action={agregarMiembroEquipo} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="actividad_id" value={actividadId} />
          <div className="flex min-w-56 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Usuario</label>
            {candidatos.length === 1 ? (
              // Con un solo candidato, el Select de Base UI puede abrir y cerrar el popup en
              // el mismo gesto sin confirmar la selección, bloqueando el submit silenciosamente
              // (mismo bug que actividad-form.tsx). Con una sola opción no hay nada que elegir.
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
            )}
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

// Flujograma institucional real: antes de cualquier trabajo, el equipo firma de recibido el
// nombramiento y su Declaración de Independencia — se exige para poder cerrar Planificación
// (ver el trigger `validar_avance_etapa`).
function ConfirmacionEquipo({
  actividadId,
  miembro,
  puedeEditar,
}: {
  actividadId: string;
  miembro: ActividadEquipo;
  puedeEditar: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <ConfirmacionCampo
        actividadId={actividadId}
        usuarioNit={miembro.usuario_nit}
        campo="recibido"
        etiqueta="Recibido del nombramiento"
        fecha={miembro.fecha_recibido}
        puedeEditar={puedeEditar}
      />
      <ConfirmacionCampo
        actividadId={actividadId}
        usuarioNit={miembro.usuario_nit}
        campo="declaracion"
        etiqueta="Declaración de Independencia"
        fecha={miembro.fecha_declaracion_independencia}
        puedeEditar={puedeEditar}
      />
    </div>
  );
}

function ConfirmacionCampo({
  actividadId,
  usuarioNit,
  campo,
  etiqueta,
  fecha,
  puedeEditar,
}: {
  actividadId: string;
  usuarioNit: string;
  campo: "recibido" | "declaracion";
  etiqueta: string;
  fecha: string | null;
  puedeEditar: boolean;
}) {
  if (fecha) {
    return (
      <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
        {etiqueta}: {fecha}
      </span>
    );
  }

  if (!puedeEditar) {
    return <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">{etiqueta}: pendiente</span>;
  }

  return (
    <form action={actualizarConfirmacionEquipo} className="flex items-center gap-1.5">
      <input type="hidden" name="actividad_id" value={actividadId} />
      <input type="hidden" name="usuario_nit" value={usuarioNit} />
      <input type="hidden" name="campo" value={campo} />
      <Input type="date" name="fecha" required className="h-7 w-32 text-xs" />
      <Button type="submit" variant="outline" size="sm" className="h-7">
        {etiqueta}
      </Button>
    </form>
  );
}
