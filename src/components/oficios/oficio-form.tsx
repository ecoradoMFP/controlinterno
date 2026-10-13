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
import { FechasOficioFields } from "@/components/oficios/fechas-oficio-fields";
import { SelectMedioEnvio } from "@/components/oficios/select-medio-envio";
import { SelectDependencia, type UnidadMinisterio } from "@/components/select-dependencia";
import type { Usuario } from "@/types/domain";

const SIN_AUDITORIA = "Sin auditoría relacionada";

export function OficioForm({
  actividades,
  unidades,
  responsable,
  asuetos,
  error,
  fieldErrors,
}: {
  /** `etiqueta`: el identificador visible de la auditoría (su CAI). */
  actividades: { id: string; etiqueta: string }[];
  unidades: UnidadMinisterio[];
  responsable: Usuario;
  asuetos: string[];
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

      <Field label="Auditoría relacionada (opcional)" htmlFor="actividad_id">
        {actividades.length === 0 ? (
          <Input id="actividad_id_display" value="Sin auditorías disponibles" disabled />
        ) : (
          // La primera opción (valor null) deja el oficio sin auditoría: así se puede deshacer una
          // selección hecha por error. Con ella la lista nunca queda con una sola opción, que es
          // cuando el Select de Base UI no confirmaba el valor elegido.
          <Select
            name="actividad_id"
            items={[{ value: null, label: SIN_AUDITORIA }, ...actividades.map((a) => ({ value: a.id, label: a.etiqueta }))]}
          >
            <SelectTrigger id="actividad_id" className="w-full">
              <SelectValue placeholder={SIN_AUDITORIA} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>{SIN_AUDITORIA}</SelectItem>
              {actividades.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <Field label="Dependencia de destino" htmlFor="dependencia_destino" error={fieldErrors?.dependencia_destino}>
        <SelectDependencia unidades={unidades} name="dependencia_destino" id="dependencia_destino" />
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

      <FechasOficioFields asuetos={asuetos} errores={fieldErrors} />

      <Field label="Medio de envío" htmlFor="medio_envio" error={fieldErrors?.medio_envio}>
        <SelectMedioEnvio id="medio_envio" />
      </Field>

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
