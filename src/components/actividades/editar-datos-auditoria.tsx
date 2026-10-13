import { editarDatosAuditoria } from "@/app/(dashboard)/actividades/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Json } from "@/types/database";
import type { Actividad } from "@/types/domain";

export type CambioAuditoria = {
  id: string;
  anterior: Json;
  nuevo: Json;
  motivo: string;
  created_at: string;
  registrado_por: { nombre: string } | null;
};

const ETIQUETAS: Record<string, string> = {
  dependencia_auditada: "Dependencia auditada",
  periodo_evaluado_inicio: "Inicio del período evaluado",
  periodo_evaluado_fin: "Fin del período evaluado",
  auditor_principal_nit: "Auditor principal",
  fecha_inicio_plazo: "Inicio del plazo",
  fecha_notificacion: "Límite de notificación",
};

/** "2026-03-26" → "26/03/2026"; otros valores, tal cual. */
const legible = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().join("/") : String(v ?? "—"));

/**
 * Corrección de los datos generales de la auditoría (jefatura, con motivo) y su bitácora. El CAI,
 * el departamento y el tipo no se corrigen: de ellos dependen el identificador y la carpeta.
 */
export function EditarDatosAuditoria({
  actividad,
  auditores,
  cambios,
  puedeCorregir,
}: {
  actividad: Pick<
    Actividad,
    "id" | "dependencia_auditada" | "periodo_evaluado_inicio" | "periodo_evaluado_fin" | "auditor_principal_nit" | "fecha_inicio_plazo" | "fecha_notificacion"
  >;
  auditores: { nit: string; nombre: string }[];
  cambios: CambioAuditoria[];
  puedeCorregir: boolean;
}) {
  const nombrePorNit = new Map(auditores.map((a) => [a.nit, a.nombre]));
  if (!puedeCorregir && cambios.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 rounded-xl border p-4">
      <div>
        <h3 className="font-medium">Datos generales de la auditoría</h3>
        <p className="text-sm text-muted-foreground">
          Si al registrar la auditoría se anotó mal un dato, la jefatura lo corrige aquí indicando el motivo. Cada
          corrección queda registrada.
        </p>
      </div>

      {puedeCorregir ? (
        <details className="rounded-lg border">
          <summary className="cursor-pointer p-3 font-medium text-primary">Corregir datos de la auditoría (jefatura)</summary>
          <form action={editarDatosAuditoria} className="flex flex-col gap-4 border-t p-4">
            <input type="hidden" name="actividad_id" value={actividad.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="ed_dependencia">Dependencia auditada</Label>
              <Input id="ed_dependencia" name="dependencia_auditada" required defaultValue={actividad.dependencia_auditada} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ed_periodo_inicio">Período evaluado: del</Label>
                <Input id="ed_periodo_inicio" name="periodo_evaluado_inicio" type="date" required defaultValue={actividad.periodo_evaluado_inicio} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ed_periodo_fin">Período evaluado: al</Label>
                <Input id="ed_periodo_fin" name="periodo_evaluado_fin" type="date" required defaultValue={actividad.periodo_evaluado_fin} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ed_inicio_plazo">Inicio del plazo</Label>
                <Input id="ed_inicio_plazo" name="fecha_inicio_plazo" type="date" required defaultValue={actividad.fecha_inicio_plazo} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ed_notificacion">Límite de notificación</Label>
                <Input id="ed_notificacion" name="fecha_notificacion" type="date" required defaultValue={actividad.fecha_notificacion} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ed_auditor">Auditor principal</Label>
              <select
                id="ed_auditor"
                name="auditor_principal_nit"
                required
                defaultValue={actividad.auditor_principal_nit}
                className="h-10 w-full rounded-lg border border-input bg-background px-3"
              >
                {auditores.map((a) => (
                  <option key={a.nit} value={a.nit}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ed_motivo">Motivo de la corrección</Label>
              <Textarea id="ed_motivo" name="motivo" required minLength={10} rows={2} />
            </div>
            <Button type="submit" className="w-fit">
              Guardar corrección
            </Button>
          </form>
        </details>
      ) : null}

      {cambios.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm">
          {cambios.map((c) => {
            const antes = (c.anterior ?? {}) as Record<string, unknown>;
            const despues = (c.nuevo ?? {}) as Record<string, unknown>;
            const campos = Object.keys(despues).filter((k) => String(antes[k]) !== String(despues[k]));
            const valor = (k: string, v: unknown) => (k === "auditor_principal_nit" ? (nombrePorNit.get(String(v)) ?? String(v)) : legible(v));
            return (
              <li key={c.id} className="border-l-2 pl-3">
                {campos.map((k) => (
                  <p key={k}>
                    <span className="font-medium">{ETIQUETAS[k] ?? k}:</span> {valor(k, antes[k])} → {valor(k, despues[k])}
                  </p>
                ))}
                <p className="text-muted-foreground">
                  {c.registrado_por?.nombre ?? "—"}, {legible(c.created_at.slice(0, 10))}. Motivo: {c.motivo}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
