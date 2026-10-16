import { BotonAccion, FormAccion } from "@/components/form-accion";
import { agregarMiembroEquipo, actualizarConfirmacionEquipo, corregirFechaEquipo } from "@/app/(dashboard)/actividades/[id]/actions";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CARGO_LABELS, type ActividadEquipo, type Usuario } from "@/types/domain";

export type CorreccionFechaEquipo = {
  id: string;
  usuario_nit: string;
  campo: string;
  fecha_anterior: string;
  fecha_nueva: string;
  motivo: string;
  created_at: string;
  registrado_por: { nombre: string } | null;
};

const ETIQUETA_CAMPO: Record<string, string> = {
  recibido: "Recibido del nombramiento",
  declaracion: "Declaración de Independencia",
};

export function EquipoPanel({
  actividadId,
  equipo,
  candidatos,
  correcciones,
  puedeEditar,
  puedeCorregir,
}: {
  actividadId: string;
  equipo: (ActividadEquipo & { usuarios: Pick<Usuario, "nombre" | "cargo" | "puesto"> | null })[];
  candidatos: Usuario[];
  correcciones: CorreccionFechaEquipo[];
  puedeEditar: boolean;
  puedeCorregir: boolean;
}) {
  return (
    <div id="equipo" className="flex scroll-mt-4 flex-col gap-4">
      <ul className="divide-y tarjeta">
        {equipo.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">Sin miembros de equipo asignados aún.</li>
        ) : (
          equipo.map((m) => (
            <li key={m.usuario_nit} className="flex flex-col gap-2 p-3 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span>
                    {m.usuarios?.nombre ?? m.usuario_nit}
                    {m.usuarios?.cargo ? ` · ${CARGO_LABELS[m.usuarios.cargo]}` : ""}
                  </span>
                  <span className="ml-2 text-muted-foreground">{m.rol_en_equipo ?? "—"}</span>
                </div>
                <ConfirmacionEquipo actividadId={actividadId} miembro={m} puedeEditar={puedeEditar} puedeCorregir={puedeCorregir} />
              </div>
              <HistorialCorrecciones correcciones={correcciones.filter((c) => c.usuario_nit === m.usuario_nit)} />
            </li>
          ))
        )}
      </ul>

      {puedeEditar ? (
        <details className="group rounded-xl border border-dashed" open={equipo.length === 0}>
          <summary className="cursor-pointer list-none p-3 text-sm font-medium text-primary">+ Agregar al equipo</summary>
        <FormAccion action={agregarMiembroEquipo} mantenerAbierto className="flex flex-wrap items-end gap-3 border-t p-3">
          <input type="hidden" name="actividad_id" value={actividadId} />
          <div className="flex min-w-56 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Usuario</label>
            {candidatos.length === 1 ? (
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
                  <SelectValue placeholder="Seleccione un usuario" />
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
          <BotonAccion>Agregar</BotonAccion>
        </FormAccion>
        </details>
      ) : null}
    </div>
  );
}

export function ConfirmacionEquipo({
  actividadId,
  miembro,
  puedeEditar,
  puedeCorregir,
}: {
  actividadId: string;
  miembro: ActividadEquipo;
  puedeEditar: boolean;
  puedeCorregir: boolean;
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
        puedeCorregir={puedeCorregir}
      />
      <ConfirmacionCampo
        actividadId={actividadId}
        usuarioNit={miembro.usuario_nit}
        campo="declaracion"
        etiqueta="Declaración de Independencia"
        fecha={miembro.fecha_declaracion_independencia}
        puedeEditar={puedeEditar}
        puedeCorregir={puedeCorregir}
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
  puedeCorregir,
}: {
  actividadId: string;
  usuarioNit: string;
  campo: "recibido" | "declaracion";
  etiqueta: string;
  fecha: string | null;
  puedeEditar: boolean;
  puedeCorregir: boolean;
}) {
  if (fecha) {
    const registrada = (
      <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
        {etiqueta}: {fecha}
      </span>
    );
    if (!puedeCorregir) return registrada;
    return (
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1.5">
          {registrada}
          <span className="text-primary underline-offset-2 group-open:hidden hover:underline">Corregir</span>
        </summary>
        <FormAccion action={corregirFechaEquipo} className="mt-2 flex w-72 flex-col gap-2 rounded-lg border bg-background p-3">
          <input type="hidden" name="actividad_id" value={actividadId} />
          <input type="hidden" name="usuario_nit" value={usuarioNit} />
          <input type="hidden" name="campo" value={campo} />
          <label className="flex flex-col gap-1">
            <span className="font-medium">Nueva fecha de {etiqueta.toLowerCase()}</span>
            <Input type="date" name="fecha" required defaultValue={fecha} className="h-8 text-xs" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Motivo de la corrección</span>
            <Textarea name="motivo" required minLength={10} rows={2} className="text-xs" />
          </label>
          <BotonAccion variant="outline" size="sm" className="w-fit">
            Guardar corrección
          </BotonAccion>
        </FormAccion>
      </details>
    );
  }

  if (!puedeEditar) {
    return <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">{etiqueta}: pendiente</span>;
  }

  return (
    <FormAccion action={actualizarConfirmacionEquipo} className="flex items-center gap-1.5">
      <input type="hidden" name="actividad_id" value={actividadId} />
      <input type="hidden" name="usuario_nit" value={usuarioNit} />
      <input type="hidden" name="campo" value={campo} />
      <Input type="date" name="fecha" required className="h-7 w-32 text-xs" />
      <BotonAccion variant="outline" size="sm" className="h-7">
        {etiqueta}
      </BotonAccion>
    </FormAccion>
  );
}

function HistorialCorrecciones({ correcciones }: { correcciones: CorreccionFechaEquipo[] }) {
  if (correcciones.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 border-l-2 pl-3 text-xs text-muted-foreground">
      {correcciones.map((c) => (
        <li key={c.id}>
          <span className="font-medium text-foreground">{ETIQUETA_CAMPO[c.campo] ?? c.campo}</span> corregida de {c.fecha_anterior} a{" "}
          {c.fecha_nueva} por {c.registrado_por?.nombre ?? "—"} el {c.created_at.slice(0, 10)}. Motivo: {c.motivo}
        </li>
      ))}
    </ul>
  );
}
