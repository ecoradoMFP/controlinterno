import { createClient } from "@/lib/supabase/server";
import type { CargoEnum, Usuario } from "@/types/domain";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Perfil de negocio (tabla `usuarios`) del usuario autenticado, o null si la sesión de
 * Supabase Auth no está vinculada a ningún perfil (alta administrativa pendiente, sección
 * 12.4). Nunca lanza: la ausencia de perfil es un estado esperado, no un error.
 */
export async function getUsuarioActual(): Promise<Usuario | null> {
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

  return data;
}

/**
 * Defensa en profundidad (sección 12.3): además de RLS, las Server Functions que mutan datos
 * verifican explícitamente `permiso_sistema` antes de tocar la base.
 */
export function puedeEscribir(usuario: Pick<Usuario, "permiso_sistema"> | null): boolean {
  if (!usuario) return false;
  return usuario.permiso_sistema !== "consulta";
}

/**
 * Replica en la app la regla del trigger `oficios_proteger_hechos_consumados` (sección
 * 12.1/12.5): una vez capturada fecha_envio/fecha_recepcion/fecha_respuesta, solo
 * `permiso_sistema='control_total'` puede corregirla. Sin este chequeo, `SeguimientoPanel`
 * mostraba el botón "Corregir" a cualquiera con permiso de escritura (captura_propia/
 * captura_delegada) y el intento fallaba silenciosamente contra el trigger.
 */
export function puedeCorregirHechoConsumado(usuario: Pick<Usuario, "permiso_sistema"> | null): boolean {
  return usuario?.permiso_sistema === "control_total";
}

/**
 * Replica en la app el alcance de cargo de la política RLS `actividades_update` (jefe/subjefe
 * del mismo departamento, subdirector de la subdirección que lo agrupa, o director) — no solo
 * `permiso_sistema` como hace `puedeEscribir`. Sin esto, `puedeEditar` (basado solo en
 * `puedeEscribir`) mostraba el botón "Cerrar etapa" a un Auditor que jamás puede usarlo, y al
 * intentarlo el único error que veía era el mensaje crudo de Postgres/RLS — encontrado en vivo
 * durante la prueba de integración de 2026-09-03.
 */
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

// Lista blanca explícita (no "cargo !== 'auditor'"): el sistema puede tener personal no
// jerárquico sin cargo (sección 4.3, ej. un asistente de archivo, `cargo === null`). Un
// exclude-list como `!== "auditor"` deja pasar cualquier valor futuro que no sea literalmente
// "auditor" — con una lista de qué SÍ está permitido, un cargo nuevo o null nunca califica por
// accidente. Espeja `authz.tiene_cargo_gestion_capacitaciones` en SQL.
const CARGOS_GESTION_CAPACITACIONES: readonly CargoEnum[] = ["jefe", "subjefe", "subdirector", "director"];

/**
 * Módulo de capacitaciones: cargar horas de capacitación es función de jefatura, no
 * autogestión. Espeja la función SQL `authz.puede_gestionar_capacitaciones`.
 */
export function puedeGestionarCapacitaciones(usuario: Pick<Usuario, "permiso_sistema" | "cargo"> | null): boolean {
  return puedeEscribir(usuario) && !!usuario?.cargo && CARGOS_GESTION_CAPACITACIONES.includes(usuario.cargo);
}

/**
 * Departamentos sobre los que el usuario actual puede registrar capacitaciones ajenas: el
 * suyo (jefe/subjefe), los de su subdirección (subdirector), o todos (director/control_total).
 * Director/Subdirección mismos no tienen `departamento_id` — ver `puedeGestionarCapacitacionDe`
 * para el caso de "propia capacitación", que esta función no cubre. Espeja
 * `authz.departamentos_visibles` + `authz.puede_gestionar_capacitaciones`.
 */
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

/**
 * Puede el usuario actual registrar/corregir capacitaciones de `persona`: espeja exactamente
 * la policy RLS `capacitaciones_insert/update/delete` — su propia capacitación (si no es
 * Auditor, cubre a Director/Subdirección que no tienen `departamento_id`), o alguien dentro de
 * `departamentosGestionables`.
 */
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

/**
 * Módulo de seguimiento a recomendaciones: espeja `authz.puede_operar_informe` (RLS) — el
 * equipo asignado al informe (supervisor/coordinador/auditores en `informes_auditoria_equipo`)
 * puede capturar deficiencias/recomendaciones/seguimientos, además de jefe/subjefe del
 * departamento del informe, subdirector de esa subdirección, o director. Usado solo para
 * mostrar/ocultar botones — la autorización real la sigue haciendo RLS.
 */
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

/**
 * Espeja `authz.puede_nombrar_seguimiento`: emitir nombramientos de seguimiento a
 * recomendaciones es función de jefatura (director, subdirector de la subdirección, jefe/subjefe
 * del departamento) — la misma lista blanca de cargos que `departamentosGestionables`.
 */
export async function departamentosParaNombrarSeguimiento(
  usuario: Pick<Usuario, "permiso_sistema" | "cargo" | "nit" | "departamento_id"> | null,
  supabase: SupabaseServerClient,
): Promise<string[]> {
  return departamentosGestionables(usuario, supabase);
}

/**
 * Espeja `authz.puede_dar_seguimiento`: registrar el seguimiento de una recomendación lo puede
 * hacer quien opera el informe (equipo/jefatura) o el auditor nombrado para darle seguimiento,
 * aunque no haya sido parte del equipo de la auditoría original.
 */
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
