import { agregarRevisor, agregarFirmante } from "@/app/(dashboard)/oficios/[id]/actions";
import { BotonAccion, FormAccion, type ResultadoAccion } from "@/components/form-accion";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARGO_LABELS, type Usuario } from "@/types/domain";

type Participante = { usuario_nit: string; usuarios: Pick<Usuario, "nombre" | "cargo" | "puesto"> | null };

export function ParticipantesPanel({
  oficioId,
  revisores,
  firmantes,
  candidatosRevisores,
  candidatosFirmantes,
  puedeEditar,
}: {
  oficioId: string;
  revisores: Participante[];
  firmantes: Participante[];
  candidatosRevisores: Usuario[];
  candidatosFirmantes: Usuario[];
  puedeEditar: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Lista
        titulo="Revisores"
        participantes={revisores}
        candidatos={candidatosRevisores}
        oficioId={oficioId}
        action={agregarRevisor}
        puedeEditar={puedeEditar}
        vacio="Sin revisores asignados aún."
      />
      <Lista
        titulo="Firmantes"
        participantes={firmantes}
        candidatos={candidatosFirmantes}
        oficioId={oficioId}
        action={agregarFirmante}
        puedeEditar={puedeEditar}
        vacio="Sin firmantes asignados aún."
      />
    </div>
  );
}

function Lista({
  titulo,
  participantes,
  candidatos,
  oficioId,
  action,
  puedeEditar,
  vacio,
}: {
  titulo: string;
  participantes: Participante[];
  candidatos: Usuario[];
  oficioId: string;
  action: (formData: FormData) => Promise<ResultadoAccion>;
  puedeEditar: boolean;
  vacio: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">{titulo}</h3>
      <ul className="divide-y tarjeta">
        {participantes.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">{vacio}</li>
        ) : (
          participantes.map((p) => (
            <li key={p.usuario_nit} className="flex items-center justify-between p-3 text-sm">
              <span>
                {p.usuarios?.nombre ?? p.usuario_nit}
                {p.usuarios?.cargo ? ` · ${CARGO_LABELS[p.usuarios.cargo]}` : ""}
              </span>
            </li>
          ))
        )}
      </ul>

      {puedeEditar && candidatos.length > 0 ? (
        <details className="rounded-xl border border-dashed">
          <summary className="cursor-pointer list-none p-3 text-sm font-medium text-primary">+ Agregar a {titulo.toLowerCase()}</summary>
        <FormAccion action={action} className="flex flex-wrap items-end gap-3 border-t p-3">
          <input type="hidden" name="oficio_id" value={oficioId} />
          <div className="flex min-w-56 flex-col gap-1.5">
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
          <BotonAccion>Agregar</BotonAccion>
        </FormAccion>
        </details>
      ) : null}
    </div>
  );
}
