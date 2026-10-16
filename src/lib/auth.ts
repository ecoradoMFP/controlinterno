import { createClient } from "@/lib/supabase/server";
import type { CargoEnum, Usuario } from "@/types/domain";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type UsuarioActual = Usuario & {
  cargo_temporal: {
    cargo: CargoEnum;
    cargo_original: CargoEnum | null;
    departamento_original: string | null;
    fecha_fin: string;
    documento_respaldo: string;
  } | null;
};

export async function getUsuarioActual(): Promise<UsuarioActual | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!data) return null;

  const { data: temporal } = await supabase.rpc("mi_cargo_temporal");
  const vigente = temporal?.[0];
  if (!vigente) return { ...data, cargo_temporal: null };

  return {
    ...data,
    cargo: vigente.cargo,
    departamento_id: vigente.departamento_id,
    cargo_temporal: {
      cargo: vigente.cargo,
      cargo_original: data.cargo,
      departamento_original: data.departamento_id,
      fecha_fin: vigente.fecha_fin,
      documento_respaldo: vigente.documento_respaldo,
    },
  };
}

export function puedeEscribir(usuario: Pick<Usuario, "permiso_sistema"> | null): boolean {
  if (!usuario) return false;
  return usuario.permiso_sistema !== "consulta";
}

export function puedeCorregirHechoConsumado(usuario: Pick<Usuario, "permiso_sistema"> | null): boolean {
  return usuario?.permiso_sistema === "control_total";
}

export function esJefaturaAuditoria(usuario: Pick<Usuario, "permiso_sistema" | "cargo"> | null): boolean {
  if (!usuario || !puedeEscribir(usuario)) return false;
  if (usuario.permiso_sistema === "control_total") return true;
  return usuario.cargo != null && (["subjefe", "jefe", "subdirector", "director"] as const).includes(usuario.cargo as never);
}

export async function puedeCerrarEtapaActividad(
  usuario: Pick<Usuario, "permiso_sistema" | "cargo" | "nit" | "departamento_id"> | null,
  actividadId: string,
  supabase: SupabaseServerClient,
): Promise<boolean> {
  if (!puedeEscribir(usuario) || !usuario?.cargo) return false;
  if (usuario.cargo === "director") return true;

  const { data: actividad } = await supabase
    .from("actividades")
    .select("departamento_id, departamentos(subdireccion_id)")
    .eq("id", actividadId)
    .maybeSingle();
  if (!actividad) return false;

  if (usuario.cargo === "jefe" || usuario.cargo === "subjefe") {
    return usuario.departamento_id === actividad.departamento_id;
  }

  if (usuario.cargo === "subdirector") {
    const subdireccionId = actividad.departamentos?.subdireccion_id;
    if (!subdireccionId) return false;
    const { data: subdireccion } = await supabase
      .from("subdirecciones")
      .select("id")
      .eq("id", subdireccionId)
      .eq("subdirector_nit", usuario.nit)
      .maybeSingle();
    return !!subdireccion;
  }

  return false;
}

const CARGOS_GESTION_CAPACITACIONES: readonly CargoEnum[] = ["jefe", "subjefe", "subdirector", "director"];

export function puedeGestionarCapacitaciones(usuario: Pick<Usuario, "permiso_sistema" | "cargo"> | null): boolean {
  return puedeEscribir(usuario) && !!usuario?.cargo && CARGOS_GESTION_CAPACITACIONES.includes(usuario.cargo);
}

export async function departamentosGestionables(
  usuario: Pick<Usuario, "permiso_sistema" | "cargo" | "nit" | "departamento_id"> | null,
  supabase: SupabaseServerClient,
): Promise<string[]> {
  if (!puedeGestionarCapacitaciones(usuario)) return [];

  if (usuario!.cargo === "director") {
    const { data } = await supabase.from("departamentos").select("id");
    return (data ?? []).map((d) => d.id);
  }

  if (usuario!.cargo === "jefe" || usuario!.cargo === "subjefe") {
    return usuario!.departamento_id ? [usuario!.departamento_id] : [];
  }

  if (usuario!.cargo === "subdirector") {
    const { data: subdireccion } = await supabase
      .from("subdirecciones")
      .select("id")
      .eq("subdirector_nit", usuario!.nit)
      .maybeSingle();
    if (!subdireccion) return [];

    const { data } = await supabase.from("departamentos").select("id").eq("subdireccion_id", subdireccion.id);
    return (data ?? []).map((d) => d.id);
  }

  return [];
}

export async function puedeGestionarCapacitacionDe(
  usuario: Pick<Usuario, "permiso_sistema" | "cargo" | "nit" | "departamento_id"> | null,
  persona: Pick<Usuario, "nit" | "departamento_id">,
  supabase: SupabaseServerClient,
): Promise<boolean> {
  if (puedeGestionarCapacitaciones(usuario) && usuario!.nit === persona.nit) return true;
  if (persona.departamento_id == null) return usuario?.cargo === "director" && puedeEscribir(usuario);

  const gestionables = await departamentosGestionables(usuario, supabase);
  return gestionables.includes(persona.departamento_id);
}

export async function puedeOperarInforme(
  usuario: Pick<Usuario, "permiso_sistema" | "cargo" | "nit" | "departamento_id"> | null,
  informeId: string,
  supabase: SupabaseServerClient,
): Promise<boolean> {
  if (!puedeEscribir(usuario) || !usuario?.cargo) return false;
  if (usuario.cargo === "director") return true;

  const { data: informe } = await supabase
    .from("informes_auditoria")
    .select("departamento_id, departamentos(subdireccion_id)")
    .eq("id", informeId)
    .maybeSingle();
  if (!informe) return false;

  if (usuario.cargo === "jefe" || usuario.cargo === "subjefe") {
    if (usuario.departamento_id === informe.departamento_id) return true;
  }

  if (usuario.cargo === "subdirector") {
    const subdireccionId = informe.departamentos?.subdireccion_id;
    if (subdireccionId) {
      const { data: subdireccion } = await supabase
        .from("subdirecciones")
        .select("id")
        .eq("id", subdireccionId)
        .eq("subdirector_nit", usuario.nit)
        .maybeSingle();
      if (subdireccion) return true;
    }
  }

  const { data: equipo } = await supabase
    .from("informes_auditoria_equipo")
    .select("usuario_nit")
    .eq("informe_id", informeId)
    .eq("usuario_nit", usuario.nit)
    .maybeSingle();
  if (equipo) return true;

  const { data: roles } = await supabase
    .from("informes_auditoria")
    .select("supervisor_nit, coordinador_nit")
    .eq("id", informeId)
    .maybeSingle();
  return roles?.supervisor_nit === usuario.nit || roles?.coordinador_nit === usuario.nit;
}

export async function departamentosParaNombrarSeguimiento(
  usuario: Pick<Usuario, "permiso_sistema" | "cargo" | "nit" | "departamento_id"> | null,
  supabase: SupabaseServerClient,
): Promise<string[]> {
  return departamentosGestionables(usuario, supabase);
}

export async function puedeDarSeguimiento(
  usuario: Pick<Usuario, "permiso_sistema" | "cargo" | "nit" | "departamento_id"> | null,
  informeId: string,
  supabase: SupabaseServerClient,
): Promise<boolean> {
  if (await puedeOperarInforme(usuario, informeId, supabase)) return true;
  if (!puedeEscribir(usuario)) return false;

  const { data } = await supabase
    .from("documentos_seguimiento_informes")
    .select("documento_id, documentos_seguimiento!inner(documentos_seguimiento_auditores!inner(usuario_nit))")
    .eq("informe_id", informeId)
    .eq("documentos_seguimiento.documentos_seguimiento_auditores.usuario_nit", usuario!.nit)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export function departamentosCargoTemporal(usuario: UsuarioActual | null): "todos" | string[] | null {
  if (!usuario || !puedeEscribir(usuario)) return null;
  const cargo = usuario.cargo_temporal ? usuario.cargo_temporal.cargo_original : usuario.cargo;
  const departamento = usuario.cargo_temporal ? usuario.cargo_temporal.departamento_original : usuario.departamento_id;
  if (cargo === "director" || cargo === "subdirector") return "todos";
  if ((cargo === "jefe" || cargo === "subjefe") && departamento) return [departamento];
  return null;
}

export async function puedeRegistrarPermisos(
  usuario: Pick<Usuario, "permiso_sistema" | "nit"> | null,
  supabase: SupabaseServerClient,
): Promise<boolean> {
  if (!usuario) return false;
  if (usuario.permiso_sistema === "control_total") return true;
  if (!puedeEscribir(usuario)) return false;
  const { data } = await supabase.from("permisos_encargados").select("usuario_nit").eq("usuario_nit", usuario.nit).maybeSingle();
  return !!data;
}

const CARGOS_VEN_PERMISOS: readonly CargoEnum[] = ["jefe", "subjefe", "subdirector", "director"];

export function veConsolidadoPermisos(usuario: Pick<Usuario, "cargo"> | null, registra: boolean): boolean {
  return registra || (!!usuario?.cargo && CARGOS_VEN_PERMISOS.includes(usuario.cargo));
}
