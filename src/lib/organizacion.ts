// Resuelve "quién ocupa qué cargo en qué departamento/subdirección" a partir de las tablas de
// referencia. Antes vivía duplicado en el job de alertas y en /reportes; ahora es una sola
// fuente para que ambos coincidan si mañana cambia un jefe o un subdirector.

import type { CargoEnum } from "@/types/domain";

export interface MapaOrganizacional {
  /** nits de jefe/subjefe por departamento_id. */
  jefaturaPorDepartamento: Map<string, string[]>;
  /** nit del subdirector por departamento_id (vía la subdirección que lo agrupa). */
  subdirectorPorDepartamento: Map<string, string>;
  /** nits de todos los directores activos (Dirección ve/responde por todo, sección 8). */
  directores: string[];
}

export function construirMapaOrganizacional(
  usuarios: readonly { nit: string; cargo: CargoEnum | null; departamento_id: string | null }[],
  departamentos: readonly { id: string; subdireccion_id: string | null }[],
  subdirecciones: readonly { id: string; subdirector_nit: string | null }[],
): MapaOrganizacional {
  const subdirectorPorSubdireccion = new Map(
    subdirecciones.filter((s) => s.subdirector_nit).map((s) => [s.id, s.subdirector_nit!]),
  );
  const subdirectorPorDepartamento = new Map<string, string>();
  for (const d of departamentos) {
    const nit = d.subdireccion_id ? subdirectorPorSubdireccion.get(d.subdireccion_id) : undefined;
    if (nit) subdirectorPorDepartamento.set(d.id, nit);
  }

  const jefaturaPorDepartamento = new Map<string, string[]>();
  const directores: string[] = [];
  for (const u of usuarios) {
    if (u.cargo === "director") directores.push(u.nit);
    if ((u.cargo === "jefe" || u.cargo === "subjefe") && u.departamento_id) {
      const lista = jefaturaPorDepartamento.get(u.departamento_id) ?? [];
      lista.push(u.nit);
      jefaturaPorDepartamento.set(u.departamento_id, lista);
    }
  }

  return { jefaturaPorDepartamento, subdirectorPorDepartamento, directores };
}

/**
 * Quién responde por un documento/oficio actualmente en manos de `cargo`, dentro del
 * departamento `departamentoId`. `auditor` es responsabilidad de personas concretas asignadas a
 * la actividad (el equipo), así que ese caso no lo resuelve este mapa — lo decide el llamador con
 * la lista de equipo de la actividad puntual.
 */
export function responsablesPorCargo(
  mapa: MapaOrganizacional,
  cargo: CargoEnum,
  departamentoId: string | null,
): string[] {
  if (cargo === "director") return mapa.directores;
  if (cargo === "subdirector") {
    const nit = departamentoId ? mapa.subdirectorPorDepartamento.get(departamentoId) : undefined;
    return nit ? [nit] : [];
  }
  if ((cargo === "jefe" || cargo === "subjefe") && departamentoId) {
    return mapa.jefaturaPorDepartamento.get(departamentoId) ?? [];
  }
  return [];
}
