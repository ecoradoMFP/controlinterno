import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export type UnidadMinisterio = { id: string; nombre: string; padre_id: string | null; orden: number };

/**
 * Selector de dependencia basado en la estructura organizacional del Ministerio
 * (tabla `unidades_ministerio`). Agrupa por unidad superior: el Despacho agrupa sus direcciones de
 * apoyo y los 4 viceministerios; cada viceministerio agrupa sus direcciones. Envía el NOMBRE de la
 * unidad (los informes/actividades lo guardan como texto).
 */
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
  // Un grupo por cada unidad que tiene hijas (el despacho y cada viceministerio); la propia
  // unidad superior también es seleccionable (p. ej. auditar un viceministerio completo).
  const grupos = raices.flatMap((raiz) => [
    { etiqueta: raiz.nombre, unidades: [raiz, ...hijas(raiz.id).filter((h) => hijas(h.id).length === 0)] },
    ...hijas(raiz.id)
      .filter((h) => hijas(h.id).length > 0)
      .map((vice) => ({ etiqueta: vice.nombre, unidades: [vice, ...hijas(vice.id)] })),
  ]);

  return (
    <Select name={name} required items={Object.fromEntries(unidades.map((u) => [u.nombre, u.nombre]))}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Selecciona la dependencia" />
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
