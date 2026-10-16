"use client";

import { useState } from "react";
import { BotonAccion, FormAccion } from "@/components/form-accion";
import { Input } from "@/components/ui/input";
import { registrarPermiso, corregirPermiso } from "@/app/(dashboard)/permisos/actions";
import { JORNADA_FIN, JORNADA_INICIO, TIPOS_PERMISO, TIPO_PERMISO_AYUDA, TIPO_PERMISO_LABELS } from "@/lib/permisos";
import type { TipoPermisoPersonalEnum } from "@/types/domain";

const SELECT_CLASES = "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm";

export type PersonaOpcion = { nit: string; nombre: string; departamento: string };

export type PermisoExistente = {
  id: string;
  usuario_nit: string;
  fecha: string;
  tipo: TipoPermisoPersonalEnum;
  hora_inicio: string | null;
  hora_fin: string | null;
  motivo: string;
};

function Campo({ label, htmlFor, children, ayuda }: { label: string; htmlFor: string; children: React.ReactNode; ayuda?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {ayuda ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
    </div>
  );
}

export function PermisoForm({
  personas,
  usuarioNit,
  existente,
  hoy,
}: {
  personas?: PersonaOpcion[];
  usuarioNit?: string;
  existente?: PermisoExistente;
  hoy: string;
}) {
  const [tipo, setTipo] = useState<TipoPermisoPersonalEnum | "">(existente?.tipo ?? "");
  const sufijo = existente?.id ?? "nuevo";
  const id = (campo: string) => `${campo}-${sufijo}`;
  const hhmm = (h: string | null | undefined) => (h ? h.slice(0, 5) : "");

  const departamentos = [...new Set((personas ?? []).map((p) => p.departamento))];

  return (
    <FormAccion
      action={existente ? corregirPermiso : registrarPermiso}
      mantenerAbierto={!existente}
      className="flex flex-col gap-4"
    >
      {existente ? <input type="hidden" name="id" value={existente.id} /> : null}
      {personas ? null : <input type="hidden" name="usuario_nit" value={existente?.usuario_nit ?? usuarioNit} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {personas ? (
          <Campo label="Persona" htmlFor={id("usuario_nit")}>
            <select id={id("usuario_nit")} name="usuario_nit" required defaultValue="" className={SELECT_CLASES}>
              <option value="" disabled>
                Seleccione
              </option>
              {departamentos.map((d) => (
                <optgroup key={d} label={d}>
                  {personas
                    .filter((p) => p.departamento === d)
                    .map((p) => (
                      <option key={p.nit} value={p.nit}>
                        {p.nombre}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </Campo>
        ) : null}

        <Campo label="Fecha" htmlFor={id("fecha")}>
          <Input id={id("fecha")} name="fecha" type="date" required defaultValue={existente?.fecha ?? hoy} />
        </Campo>

        <Campo label="Tipo" htmlFor={id("tipo")} ayuda={tipo ? TIPO_PERMISO_AYUDA[tipo] : undefined}>
          <select
            id={id("tipo")}
            name="tipo"
            required
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoPermisoPersonalEnum)}
            className={SELECT_CLASES}
          >
            <option value="" disabled>
              Seleccione
            </option>
            {TIPOS_PERMISO.map((t) => (
              <option key={t} value={t}>
                {TIPO_PERMISO_LABELS[t]}
              </option>
            ))}
          </select>
        </Campo>

        {tipo === "entrada_tardia" ? (
          <Campo label="Hora en que marcó su entrada" htmlFor={id("hora_llegada")} ayuda="Se cuenta desde las 8:00.">
            <Input
              id={id("hora_llegada")}
              name="hora_llegada"
              type="time"
              required
              min="08:01"
              max={JORNADA_FIN}
              defaultValue={existente?.tipo === "entrada_tardia" ? hhmm(existente.hora_fin) : ""}
            />
          </Campo>
        ) : null}

        {tipo && tipo !== "entrada_tardia" && tipo !== "nota_marcaje" ? (
          <>
            <Campo label="De (hora de salida)" htmlFor={id("hora_inicio")}>
              <Input
                id={id("hora_inicio")}
                name="hora_inicio"
                type="time"
                required
                min={JORNADA_INICIO}
                max={JORNADA_FIN}
                defaultValue={hhmm(existente?.hora_inicio)}
              />
            </Campo>
            <Campo label="A (hora de regreso)" htmlFor={id("hora_fin")} ayuda="Si no regresó, ponga 16:30.">
              <Input
                id={id("hora_fin")}
                name="hora_fin"
                type="time"
                required
                min={JORNADA_INICIO}
                max={JORNADA_FIN}
                defaultValue={hhmm(existente?.hora_fin)}
              />
            </Campo>
          </>
        ) : null}

        <div className="sm:col-span-2 lg:col-span-3">
          <Campo label="Motivo (opcional)" htmlFor={id("motivo")} ayuda="Si lo deja en blanco, se anota el nombre del tipo.">
            <Input
              id={id("motivo")}
              name="motivo"
              maxLength={300}
              placeholder="Por ejemplo: Cita IGSS, Comisión CORECHA, Reunión en centro educativo"
              defaultValue={existente?.motivo ?? ""}
            />
          </Campo>
        </div>
      </div>

      <BotonAccion className="self-start">{existente ? "Guardar corrección" : "Registrar"}</BotonAccion>
    </FormAccion>
  );
}
