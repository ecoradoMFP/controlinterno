import { registrarCapacitacion } from "@/app/(dashboard)/capacitaciones/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function CapacitacionForm({
  personalId,
  fieldErrors,
}: {
  personalId: string;
  fieldErrors?: Record<string, string>;
}) {
  return (
    <form action={registrarCapacitacion} className="flex flex-col gap-4 rounded-xl border shadow-sm p-4">
      <h2 className="font-medium">Registrar capacitación</h2>
      <input type="hidden" name="personal_id" value={personalId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Field label="Capacitación" htmlFor="nombre" error={fieldErrors?.nombre}>
          <Input id="nombre" name="nombre" required />
        </Field>
        <Field label="Institución" htmlFor="institucion" error={fieldErrors?.institucion}>
          <Input id="institucion" name="institucion" required />
        </Field>
        <Field label="Horas" htmlFor="horas" error={fieldErrors?.horas}>
          <Input id="horas" name="horas" type="number" step="0.5" min="0.5" required />
        </Field>
        <Field label="Fecha" htmlFor="fecha" error={fieldErrors?.fecha}>
          <Input id="fecha" name="fecha" type="date" required />
        </Field>
      </div>
      <Button type="submit" className="self-start">
        Registrar
      </Button>
    </form>
  );
}
