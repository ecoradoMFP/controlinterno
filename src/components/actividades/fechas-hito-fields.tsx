"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { diasHabilesEntre } from "@/lib/semaforo";

/**
 * Inicio, fin y días hábiles de un hito. Los días hábiles se calculan solos al elegir las dos
 * fechas (sin fines de semana ni asuetos), pero quedan editables para una excepción real: en
 * cuanto el usuario escribe su propio número, ya no se recalcula encima.
 */
export function FechasHitoFields({ asuetos }: { asuetos: string[] }) {
  const inicio = useRef<HTMLInputElement>(null);
  const fin = useRef<HTMLInputElement>(null);
  const dias = useRef<HTMLInputElement>(null);
  const editadoAMano = useRef(false);

  function recalcular() {
    if (editadoAMano.current || !inicio.current?.value || !fin.current?.value || !dias.current) return;
    if (fin.current.value < inicio.current.value) return;
    dias.current.value = String(diasHabilesEntre(inicio.current.value, fin.current.value, new Set(asuetos)));
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Del</label>
        <Input ref={inicio} name="fecha_inicio_esperada" type="date" required onChange={recalcular} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Al</label>
        <Input ref={fin} name="fecha_fin_esperada" type="date" required onChange={recalcular} />
      </div>
      <div className="flex w-36 flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Días hábiles</label>
        <Input
          ref={dias}
          name="dias_habiles_esperados"
          type="number"
          min={0}
          step={1}
          required
          placeholder="Se calcula solo"
          title="Se calcula con las fechas, sin fines de semana ni asuetos. Puede cambiarlo si hay una excepción."
          onChange={(e) => {
            // Si lo borra, vuelve a calcularse con las fechas.
            editadoAMano.current = e.target.value !== "";
            if (!editadoAMano.current) recalcular();
          }}
        />
      </div>
    </>
  );
}
