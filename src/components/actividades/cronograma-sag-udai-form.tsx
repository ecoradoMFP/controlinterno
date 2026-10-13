"use client";

import { useState } from "react";
import { registrarCronogramaSagUdai } from "@/app/(dashboard)/actividades/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACTIVIDADES_SAG_UDAI } from "@/lib/cronograma";
import { diasHabilesEntre } from "@/lib/semaforo";
import { ETAPA_ACTIVIDAD_LABELS } from "@/types/domain";

/**
 * Las 8 actividades con plazo SAG-UDAI, ya escritas: solo se llenan "Del" y "Al". Los días
 * hábiles se calculan al momento (sin fines de semana ni asuetos), igual que en el Excel.
 */
export function CronogramaSagUdaiForm({ actividadId, asuetos }: { actividadId: string; asuetos: string[] }) {
  const feriados = new Set(asuetos);
  const [fechas, setFechas] = useState<Record<string, { del: string; al: string }>>({});
  const dias = (c: string) => {
    const f = fechas[c];
    return f?.del && f?.al && f.al >= f.del ? diasHabilesEntre(f.del, f.al, feriados) : null;
  };
  const total = ACTIVIDADES_SAG_UDAI.reduce((s, a) => s + (dias(a.codigo) ?? 0), 0);
  const cambiar = (codigo: string, campo: "del" | "al", valor: string) =>
    setFechas((prev) => ({ ...prev, [codigo]: { ...(prev[codigo] ?? { del: "", al: "" }), [campo]: valor } }));

  return (
    <form action={registrarCronogramaSagUdai} className="flex flex-col gap-4">
      <input type="hidden" name="actividad_id" value={actividadId} />
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left">
          <thead className="bg-muted/50 text-sm text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">No.</th>
              <th className="p-3 font-medium">Actividad</th>
              <th className="p-3 font-medium">Etapa</th>
              <th className="p-3 font-medium">Del</th>
              <th className="p-3 font-medium">Al</th>
              <th className="p-3 text-right font-medium">Días hábiles</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ACTIVIDADES_SAG_UDAI.map((a) => {
              const d = dias(a.codigo);
              const alAntes = fechas[a.codigo]?.del && fechas[a.codigo]?.al && fechas[a.codigo].al < fechas[a.codigo].del;
              return (
                <tr key={a.codigo}>
                  <td className="p-3">{a.codigo}</td>
                  <td className="p-3 font-medium">{a.nombre}</td>
                  <td className="p-3 text-sm text-muted-foreground">{ETAPA_ACTIVIDAD_LABELS[a.etapa]}</td>
                  <td className="p-3">
                    <Input
                      type="date"
                      name={`del_${a.codigo}`}
                      required
                      aria-label={`${a.nombre}: del`}
                      className="h-10 w-40"
                      onChange={(e) => cambiar(a.codigo, "del", e.target.value)}
                    />
                  </td>
                  <td className="p-3">
                    <Input
                      type="date"
                      name={`al_${a.codigo}`}
                      required
                      aria-label={`${a.nombre}: al`}
                      className="h-10 w-40"
                      onChange={(e) => cambiar(a.codigo, "al", e.target.value)}
                    />
                  </td>
                  <td className="p-3 text-right">
                    {alAntes ? <span className="text-sm text-destructive">Revise las fechas</span> : (d ?? "—")}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t bg-muted/30">
            <tr>
              <td colSpan={5} className="p-3 font-medium">
                Total de días hábiles para realizar la auditoría
              </td>
              <td className="p-3 text-right font-semibold">{total || "—"}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        Escriba las mismas fechas que se registran en el SAG-UDAI-WEB y revíselas antes de guardar: los días hábiles ya
        descuentan fines de semana y asuetos.
      </p>
      <Button type="submit" size="lg" className="w-fit">
        Guardar cronograma
      </Button>
    </form>
  );
}
