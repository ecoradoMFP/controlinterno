"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sumarDiasHabiles } from "@/lib/semaforo";

/**
 * Emisión, plazo en días hábiles y vencimiento del oficio. El vencimiento se calcula solo con la
 * emisión y el plazo (sin fines de semana ni asuetos); se puede cambiar si hay una excepción, y en
 * cuanto se escribe a mano ya no se recalcula encima.
 */
export function FechasOficioFields({ asuetos, errores }: { asuetos: string[]; errores?: Record<string, string> }) {
  const emision = useRef<HTMLInputElement>(null);
  const plazo = useRef<HTMLInputElement>(null);
  const vence = useRef<HTMLInputElement>(null);
  const aMano = useRef(false);

  function recalcular() {
    const dias = Number(plazo.current?.value);
    if (aMano.current || !emision.current?.value || !vence.current || !Number.isInteger(dias) || dias < 1) return;
    vence.current.value = sumarDiasHabiles(emision.current.value, dias, new Set(asuetos));
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Campo label="Fecha de emisión" htmlFor="fecha_emision" error={errores?.fecha_emision}>
        <Input ref={emision} id="fecha_emision" name="fecha_emision" type="date" required onChange={recalcular} />
      </Campo>
      <Campo label="Plazo de respuesta (días hábiles, opcional)" htmlFor="plazo_respuesta_dias" error={errores?.plazo_respuesta_dias}>
        <Input ref={plazo} id="plazo_respuesta_dias" name="plazo_respuesta_dias" type="number" min={1} step={1} onChange={recalcular} />
      </Campo>
      <Campo label="Fecha de vencimiento" htmlFor="fecha_vencimiento" error={errores?.fecha_vencimiento}>
        <Input
          ref={vence}
          id="fecha_vencimiento"
          name="fecha_vencimiento"
          type="date"
          title="Se calcula con la emisión y el plazo, sin fines de semana ni asuetos. Puede cambiarla si hay una excepción."
          onChange={(e) => {
            aMano.current = e.target.value !== "";
            if (!aMano.current) recalcular();
          }}
        />
      </Campo>
      <p className="text-sm text-muted-foreground sm:col-span-3">
        Al escribir la emisión y el plazo, la fecha de vencimiento se calcula sola (sin fines de semana ni asuetos).
      </p>
    </div>
  );
}

function Campo({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
