import { registrarEnvio, registrarRecepcion, registrarRespuesta } from "@/app/(dashboard)/oficios/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Oficio } from "@/types/domain";

export function SeguimientoPanel({
  oficio,
  puedeEditar,
}: {
  oficio: Oficio;
  puedeEditar: boolean;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Paso
        titulo="Envío"
        hecho={oficio.fecha_envio ? `Enviado el ${oficio.fecha_envio}${oficio.medio_envio ? ` — ${oficio.medio_envio}` : ""}` : null}
      >
        {puedeEditar ? (
          <form action={registrarEnvio} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="oficio_id" value={oficio.id} />
            <Campo label="Fecha de envío" htmlFor="fecha_envio">
              <Input id="fecha_envio" name="fecha_envio" type="date" defaultValue={oficio.fecha_envio ?? ""} required />
            </Campo>
            <Campo label="Medio (opcional)" htmlFor="medio_envio_seguimiento">
              <Input id="medio_envio_seguimiento" name="medio_envio" defaultValue={oficio.medio_envio ?? ""} />
            </Campo>
            <Button type="submit" variant="outline">
              {oficio.fecha_envio ? "Corregir" : "Registrar envío"}
            </Button>
          </form>
        ) : null}
      </Paso>

      <Paso
        titulo="Recepción"
        hecho={oficio.fecha_recepcion ? `Recibido el ${oficio.fecha_recepcion}` : null}
      >
        {puedeEditar ? (
          <form action={registrarRecepcion} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="oficio_id" value={oficio.id} />
            <Campo label="Fecha de recepción" htmlFor="fecha_recepcion">
              <Input id="fecha_recepcion" name="fecha_recepcion" type="date" defaultValue={oficio.fecha_recepcion ?? ""} required />
            </Campo>
            <Button type="submit" variant="outline">
              {oficio.fecha_recepcion ? "Corregir" : "Registrar recepción"}
            </Button>
          </form>
        ) : null}
      </Paso>

      <Paso
        titulo="Respuesta"
        hecho={
          oficio.fecha_respuesta
            ? `Respondido el ${oficio.fecha_respuesta}${oficio.no_respuesta ? ` — ${oficio.no_respuesta}` : ""}`
            : null
        }
      >
        {puedeEditar ? (
          <form action={registrarRespuesta} className="flex flex-col gap-3">
            <input type="hidden" name="oficio_id" value={oficio.id} />
            <div className="flex flex-wrap items-end gap-3">
              <Campo label="No. de respuesta (opcional)" htmlFor="no_respuesta">
                <Input id="no_respuesta" name="no_respuesta" defaultValue={oficio.no_respuesta ?? ""} />
              </Campo>
              <Campo label="Fecha de respuesta" htmlFor="fecha_respuesta">
                <Input id="fecha_respuesta" name="fecha_respuesta" type="date" defaultValue={oficio.fecha_respuesta ?? ""} required />
              </Campo>
            </div>
            <Campo label="Observaciones (requerido si corriges una fecha ya registrada)" htmlFor="observaciones">
              <Textarea id="observaciones" name="observaciones" defaultValue={oficio.observaciones ?? ""} />
            </Campo>
            <Button type="submit" variant="outline" className="w-fit">
              {oficio.fecha_respuesta ? "Corregir" : "Registrar respuesta"}
            </Button>
          </form>
        ) : null}
      </Paso>
    </div>
  );
}

function Paso({ titulo, hecho, children }: { titulo: string; hecho: string | null; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{titulo}</h3>
        <span className="text-xs text-muted-foreground">{hecho ?? "Pendiente"}</span>
      </div>
      {children}
    </div>
  );
}

function Campo({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-48 flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
