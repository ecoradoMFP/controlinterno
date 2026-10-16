import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeRegistrarPermisos, veConsolidadoPermisos } from "@/lib/auth";

export const DIRECCION = "Dirección";
export const ORDEN_GRUPOS = [DIRECCION, "DAF", "DAE", "DAAP"];

export async function accesoPermisos() {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  if (!usuario) redirect("/login");
  const registra = await puedeRegistrarPermisos(usuario, supabase);
  if (!veConsolidadoPermisos(usuario, registra)) redirect(`/permisos/${encodeURIComponent(usuario.nit)}`);
  return { usuario, supabase, registra };
}

export async function cargarPersonal(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("usuarios").select("nit, nombre, departamentos(sigla)").eq("activo", true).order("nombre");
  const personal = data ?? [];
  const grupoDe = new Map(personal.map((p) => [p.nit, p.departamentos?.sigla ?? DIRECCION]));
  const grupos = ORDEN_GRUPOS.filter((g) => [...grupoDe.values()].includes(g));
  return { personal, grupoDe, grupos };
}
