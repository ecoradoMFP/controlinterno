"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARGOS, CARGO_LABELS, TIPO_EVENTO_LABELS, type CargoEnum } from "@/types/domain";

// Corrección de proceso (sesión 2026-09-18): el flujo de revisión siempre es lineal
// (Auditor → Subjefe → Jefe → Subdirector → Director) y una corrección siempre regresa
// directo a Auditor, nunca a un cargo intermedio. Fijar "A cargo" automáticamente en ese
// caso evita un clic/typeo innecesario en el caso más frecuente del flujo.
export function MovimientoFormFields({ cargoActual }: { cargoActual: CargoEnum }) {
  const [tipoEvento, setTipoEvento] = useState("");
  const esCorreccion = tipoEvento === "devolucion_correccion";

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">De cargo</label>
        <Select
          name="de_cargo"
          defaultValue={cargoActual}
          items={Object.fromEntries(CARGOS.map((c) => [c, CARGO_LABELS[c]]))}
        >
          <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {CARGOS.map((c) => (
              <SelectItem key={c} value={c}>{CARGO_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">A cargo</label>
        {esCorreccion ? (
          <>
            <Input value="Auditor (automático)" disabled />
            <input type="hidden" name="a_cargo" value="auditor" />
          </>
        ) : (
          <Select
            name="a_cargo"
            required
            items={Object.fromEntries(CARGOS.map((c) => [c, CARGO_LABELS[c]]))}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {CARGOS.map((c) => (
                <SelectItem key={c} value={c}>{CARGO_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Tipo de evento</label>
        <Select
          name="tipo_evento"
          required
          items={TIPO_EVENTO_LABELS}
          onValueChange={(value) => setTipoEvento(String(value ?? ""))}
        >
          <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona" /></SelectTrigger>
          <SelectContent>
            {Object.entries(TIPO_EVENTO_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
