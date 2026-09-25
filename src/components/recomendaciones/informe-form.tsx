import { crearInforme } from "@/app/(dashboard)/recomendaciones/informes/actions";
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
import type { Departamento, Usuario } from "@/types/domain";

export function InformeForm({
  departamentos,
  usuarios,
  departamentoFijo,
  error,
  fieldErrors,
}: {
  departamentos: Departamento[];
  usuarios: Usuario[];
  departamentoFijo?: Departamento;
  error?: string;
  fieldErrors?: Record<string, string>;
}) {
  const opcionesUsuario = Object.fromEntries(usuarios.map((u) => [u.nit, `${u.nombre} — ${u.puesto ?? u.cargo}`]));

  return (
    <form action={crearInforme} className="flex max-w-2xl flex-col gap-5">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <Field label="No. de nombramiento" htmlFor="no_nombramiento" error={fieldErrors?.no_nombramiento}>
          <Input id="no_nombramiento" name="no_nombramiento" placeholder="NAI-001-2026" />
        </Field>
        <Field label="CAI" htmlFor="cai" error={fieldErrors?.cai}>
          <Input id="cai" name="cai" placeholder="CAI 00006" />
        </Field>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Captura al menos uno de los dos: nombramiento o CAI.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Dependencia auditada" htmlFor="dependencia_auditada" error={fieldErrors?.dependencia_auditada}>
          <Input id="dependencia_auditada" name="dependencia_auditada" required />
        </Field>
        <Field label="Tipo de auditoría (opcional)" htmlFor="tipo_auditoria">
          <Input id="tipo_auditoria" name="tipo_auditoria" placeholder="Cumplimiento y financiera, operativa..." />
        </Field>
      </div>

      {departamentoFijo ? (
        <Field label="Departamento" htmlFor="departamento_id_display">
          <Input id="departamento_id_display" value={departamentoFijo.nombre} disabled />
          <input type="hidden" name="departamento_id" value={departamentoFijo.id} />
        </Field>
      ) : (
        <Field label="Departamento" htmlFor="departamento_id" error={fieldErrors?.departamento_id}>
          <Select name="departamento_id" required items={Object.fromEntries(departamentos.map((d) => [d.id, d.nombre]))}>
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

      <div className="grid grid-cols-3 gap-4">
        <Field label="Fecha de nombramiento" htmlFor="fecha_nombramiento" error={fieldErrors?.fecha_nombramiento}>
          <Input id="fecha_nombramiento" name="fecha_nombramiento" type="date" />
        </Field>
        <Field label="Fecha del informe final (opcional)" htmlFor="fecha_informe_final">
          <Input id="fecha_informe_final" name="fecha_informe_final" type="date" />
        </Field>
        <Field label="Fecha de notificación (opcional)" htmlFor="fecha_notificacion">
          <Input id="fecha_notificacion" name="fecha_notificacion" type="date" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Período auditado — inicio (opcional)"
          htmlFor="periodo_auditado_inicio"
          error={fieldErrors?.periodo_auditado_inicio}
        >
          <Input id="periodo_auditado_inicio" name="periodo_auditado_inicio" type="date" />
        </Field>
        <Field
          label="Período auditado — fin (opcional)"
          htmlFor="periodo_auditado_fin"
          error={fieldErrors?.periodo_auditado_fin}
        >
          <Input id="periodo_auditado_fin" name="periodo_auditado_fin" type="date" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Supervisor (opcional)" htmlFor="supervisor_nit">
          <Select name="supervisor_nit" items={opcionesUsuario}>
            <SelectTrigger id="supervisor_nit" className="w-full">
              <SelectValue placeholder="Ninguno" />
            </SelectTrigger>
            <SelectContent>
              {usuarios.map((u) => (
                <SelectItem key={u.nit} value={u.nit}>
                  {u.nombre} — {u.puesto ?? u.cargo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Coordinador (opcional)" htmlFor="coordinador_nit">
          <Select name="coordinador_nit" items={opcionesUsuario}>
            <SelectTrigger id="coordinador_nit" className="w-full">
              <SelectValue placeholder="Ninguno" />
            </SelectTrigger>
            <SelectContent>
              {usuarios.map((u) => (
                <SelectItem key={u.nit} value={u.nit}>
                  {u.nombre} — {u.puesto ?? u.cargo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Riesgo (opcional)" htmlFor="riesgo">
        <Textarea id="riesgo" name="riesgo" rows={3} />
      </Field>

      <Button type="submit" className="w-fit">
        Crear informe
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
