import { agregarRevisor, agregarFirmante } from "@/app/(dashboard)/oficios/[id]/actions";
import { Button } from "@/components/ui/button";
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
  action: (formData: FormData) => void;
  puedeEditar: boolean;
  vacio: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">{titulo}</h3>
      <ul className="divide-y rounded-lg border">
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
        <form action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="oficio_id" value={oficioId} />
          <div className="flex min-w-56 flex-col gap-1.5">
            <Select name="usuario_nit" required>
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
          <Button type="submit">Agregar</Button>
        </form>
      ) : null}
    </div>
  );
}
