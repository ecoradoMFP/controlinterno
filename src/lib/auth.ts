import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/types/domain";

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
