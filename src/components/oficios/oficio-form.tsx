import { crearOficio } from "@/app/(dashboard)/oficios/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Usuario } from "@/types/domain";

export function OficioForm({
  actividades,
  responsable,
  error,
  fieldErrors,
}: {
  actividades: { id: string; no_nombramiento: string }[];
  responsable: Usuario;
  error?: string;
  fieldErrors?: Record<string, string>;
}) {
  return (
    <form action={crearOficio} className="flex max-w-2xl flex-col gap-5">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <Field label="No. de oficio" htmlFor="no_oficio" error={fieldErrors?.no_oficio}>
          <Input id="no_oficio" name="no_oficio" placeholder="DAI-DAF-001-2026" required />
        </Field>

        <Field label="Responsable de elaboración" htmlFor="responsable_display">
          <Input id="responsable_display" value={`${responsable.nombre} — ${responsable.puesto ?? responsable.cargo}`} disabled />
          <input type="hidden" name="responsable_elaboracion_nit" value={responsable.nit} />
        </Field>
      </div>

      <Field label="Actividad relacionada (opcional)" htmlFor="actividad_id">
        {actividades.length === 0 ? (
          <Input id="actividad_id_display" value="Sin actividades disponibles" disabled />
        ) : actividades.length === 1 ? (
          // Con una sola actividad candidata, el Select de Base UI puede abrir y cerrar el
          // popup en el mismo gesto sin confirmar la selección — visto en vivo: el oficio se
          // guardaba con actividad_id=null aunque la actividad se veía "seleccionada" en
          // pantalla. Con una sola opción no hay nada que elegir, así que se fija directo.
          <>
            <Input id="actividad_id_display" value={actividades[0].no_nombramiento} disabled />
            <input type="hidden" name="actividad_id" value={actividades[0].id} />
          </>
        ) : (
          <Select
            name="actividad_id"
            items={Object.fromEntries(actividades.map((a) => [a.id, a.no_nombramiento]))}
          >
            <SelectTrigger id="actividad_id" className="w-full">
              <SelectValue placeholder="Sin actividad relacionada" />
            </SelectTrigger>
            <SelectContent>
              {actividades.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.no_nombramiento}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Destinatario" htmlFor="destinatario" error={fieldErrors?.destinatario}>
          <Input id="destinatario" name="destinatario" required />
        </Field>
        <Field label="Puesto del destinatario (opcional)" htmlFor="puesto_destinatario">
          <Input id="puesto_destinatario" name="puesto_destinatario" />
        </Field>
      </div>

      <Field label="Asunto" htmlFor="asunto" error={fieldErrors?.asunto}>
        <Textarea id="asunto" name="asunto" required />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Fecha de emisión" htmlFor="fecha_emision" error={fieldErrors?.fecha_emision}>
          <Input id="fecha_emision" name="fecha_emision" type="date" required />
        </Field>
        <Field label="Medio de envío (opcional)" htmlFor="medio_envio">
          <Input id="medio_envio" name="medio_envio" placeholder="Correo, físico, ..." />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Plazo de respuesta en días (opcional)"
          htmlFor="plazo_respuesta_dias"
          error={fieldErrors?.plazo_respuesta_dias}
        >
          <Input id="plazo_respuesta_dias" name="plazo_respuesta_dias" type="number" min={1} step={1} />
        </Field>
        <Field
          label="Fecha de vencimiento (opcional)"
          htmlFor="fecha_vencimiento"
          error={fieldErrors?.fecha_vencimiento}
        >
          <Input id="fecha_vencimiento" name="fecha_vencimiento" type="date" />
        </Field>
      </div>

      <Field label="Observaciones (opcional)" htmlFor="observaciones">
        <Textarea id="observaciones" name="observaciones" />
      </Field>

      <Button type="submit" className="w-fit">
        Crear oficio
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
