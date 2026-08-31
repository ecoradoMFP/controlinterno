import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/types/domain";

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
