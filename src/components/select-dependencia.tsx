import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export type UnidadMinisterio = { id: string; nombre: string; padre_id: string | null; orden: number };

export function SelectDependencia({
  unidades,
  name = "dependencia_auditada",
  id = "dependencia_auditada",
}: {
  unidades: UnidadMinisterio[];
  name?: string;
  id?: string;
}) {
  const hijas = (padreId: string) => unidades.filter((u) => u.padre_id === padreId).sort((a, b) => a.orden - b.orden);
  const raices = unidades.filter((u) => !u.padre_id).sort((a, b) => a.orden - b.orden);
  const grupos = raices.flatMap((raiz) => [
    { etiqueta: raiz.nombre, unidades: [raiz, ...hijas(raiz.id).filter((h) => hijas(h.id).length === 0)] },
    ...hijas(raiz.id)
      .filter((h) => hijas(h.id).length > 0)
      .map((vice) => ({ etiqueta: vice.nombre, unidades: [vice, ...hijas(vice.id)] })),
  ]);

  return (
    <Select name={name} required items={Object.fromEntries(unidades.map((u) => [u.nombre, u.nombre]))}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Seleccione la dependencia" />
      </SelectTrigger>
      <SelectContent>
        {grupos.map((g) => (
          <SelectGroup key={g.etiqueta}>
            <SelectLabel>{g.etiqueta}</SelectLabel>
            {g.unidades.map((u) => (
              <SelectItem key={u.id} value={u.nombre}>
                {u.nombre}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
