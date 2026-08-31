import { crearActividad } from "@/app/(dashboard)/actividades/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Departamento, Usuario } from "@/types/domain";

export function ActividadForm({
  departamentos,
  usuarios,
  departamentoFijo,
  error,
  fieldErrors,
}: {
  departamentos: Departamento[];
  usuarios: Usuario[];
  /** Si el usuario solo puede crear en su propio departamento (Jefe/Subjefe), se fija y no se muestra el selector. */
  departamentoFijo?: Departamento;
  error?: string;
  fieldErrors?: Record<string, string>;
}) {
  return (
    <form action={crearActividad} className="flex max-w-2xl flex-col gap-5">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <Field label="No. de nombramiento" htmlFor="no_nombramiento" error={fieldErrors?.no_nombramiento}>
          <Input id="no_nombramiento" name="no_nombramiento" placeholder="NAI-001-2026" required />
        </Field>

        {departamentoFijo ? (
          <Field label="Departamento" htmlFor="departamento_id_display">
            <Input id="departamento_id_display" value={departamentoFijo.nombre} disabled />
            <input type="hidden" name="departamento_id" value={departamentoFijo.id} />
          </Field>
        ) : (
          <Field label="Departamento" htmlFor="departamento_id" error={fieldErrors?.departamento_id}>
            <Select name="departamento_id" required>
              <SelectTrigger id="departamento_id" className="w-full">
                <SelectValue placeholder="Selecciona un departamento" />
              </SelectTrigger>
              <SelectContent>
                {departamentos.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

      <Field label="Auditor principal" htmlFor="auditor_principal_nit" error={fieldErrors?.auditor_principal_nit}>
        {usuarios.length === 1 ? (
          // Con un solo auditor candidato, el Select de Base UI puede abrir y cerrar el
          // popup en el mismo gesto (click o Enter) sin llegar a confirmar la selección,
          // dejando el input oculto vacío y bloqueando el submit silenciosamente. Con una
          // sola opción no hay nada que elegir, así que se fija igual que departamentoFijo.
          <>
            <Input
              id="auditor_principal_nit_display"
              value={`${usuarios[0].nombre} — ${usuarios[0].puesto ?? usuarios[0].cargo}`}
              disabled
            />
            <input type="hidden" name="auditor_principal_nit" value={usuarios[0].nit} />
          </>
        ) : (
          <Select name="auditor_principal_nit" required>
            <SelectTrigger id="auditor_principal_nit" className="w-full">
              <SelectValue placeholder="Selecciona al auditor principal" />
            </SelectTrigger>
            <SelectContent>
              {usuarios.map((u) => (
                <SelectItem key={u.nit} value={u.nit}>
                  {u.nombre} — {u.puesto ?? u.cargo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <Field label="Dependencia auditada" htmlFor="dependencia_auditada" error={fieldErrors?.dependencia_auditada}>
        <Input id="dependencia_auditada" name="dependencia_auditada" required />
      </Field>

      <Field label="Tipo de auditoría" htmlFor="tipo_auditoria" error={fieldErrors?.tipo_auditoria}>
        <Input
          id="tipo_auditoria"
          name="tipo_auditoria"
          placeholder="Cumplimiento y Financiera, Operativa, ..."
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Período evaluado — inicio"
          htmlFor="periodo_evaluado_inicio"
          error={fieldErrors?.periodo_evaluado_inicio}
        >
          <Input id="periodo_evaluado_inicio" name="periodo_evaluado_inicio" type="date" required />
        </Field>
        <Field
          label="Período evaluado — fin"
          htmlFor="periodo_evaluado_fin"
          error={fieldErrors?.periodo_evaluado_fin}
        >
          <Input id="periodo_evaluado_fin" name="periodo_evaluado_fin" type="date" required />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Inicio de plazo"
          htmlFor="fecha_inicio_plazo"
          error={fieldErrors?.fecha_inicio_plazo}
        >
          <Input id="fecha_inicio_plazo" name="fecha_inicio_plazo" type="date" required />
        </Field>
        <Field
          label="Fecha de notificación (límite del nombramiento)"
          htmlFor="fecha_notificacion"
          error={fieldErrors?.fecha_notificacion}
        >
          <Input id="fecha_notificacion" name="fecha_notificacion" type="date" required />
        </Field>
      </div>

      <Field
        label="Expedientes relacionados (opcional, separados por coma)"
        htmlFor="expedientes_relacionados"
      >
        <Input id="expedientes_relacionados" name="expedientes_relacionados" placeholder="DAI-DAF-012-2026, ..." />
      </Field>

      <Button type="submit" className="w-fit">
        Crear actividad
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
