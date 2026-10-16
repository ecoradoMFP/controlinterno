import type { CargoEnum } from "@/types/domain";

export interface MapaOrganizacional {
  jefaturaPorDepartamento: Map<string, string[]>;
  subdirectorPorDepartamento: Map<string, string>;
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
