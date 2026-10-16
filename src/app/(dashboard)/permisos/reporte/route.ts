import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeRegistrarPermisos, veConsolidadoPermisos } from "@/lib/auth";
import { hoyGuatemala } from "@/lib/recomendaciones";
import { generarPermisosXlsx } from "@/lib/permisos-excel";

const ORDEN_GRUPOS = ["Dirección", "DAF", "DAE", "DAAP"];

export async function GET(request: Request) {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  if (!usuario) return new Response("No autenticado", { status: 401 });
  const registra = await puedeRegistrarPermisos(usuario, supabase);
  if (!veConsolidadoPermisos(usuario, registra)) return new Response("Sin permiso", { status: 403 });

  const hoy = hoyGuatemala();
  const anio = Number(new URL(request.url).searchParams.get("anio")) || Number(hoy.slice(0, 4));

  const [{ data: personal }, { data: registros }] = await Promise.all([
    supabase.from("usuarios").select("nit, nombre, departamentos(sigla)").eq("activo", true).order("nombre"),
    supabase
      .from("permisos_personal")
      .select("usuario_nit, tipo, minutos, mes, fecha, hora_inicio, hora_fin, motivo")
      .eq("anio", anio),
  ]);

  const personas = (personal ?? [])
    .map((p) => ({ nit: p.nit, nombre: p.nombre, grupo: p.departamentos?.sigla ?? "Dirección" }))
    .sort((a, b) => ORDEN_GRUPOS.indexOf(a.grupo) - ORDEN_GRUPOS.indexOf(b.grupo) || a.nombre.localeCompare(b.nombre));
  const nits = new Set(personas.map((p) => p.nit));

  const buffer = await generarPermisosXlsx({
    anio,
    usuario: usuario.nombre,
    hoy,
    grupos: ORDEN_GRUPOS.filter((g) => personas.some((p) => p.grupo === g)),
    personas,
    registros: (registros ?? []).filter((r) => nits.has(r.usuario_nit)),
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Control de permisos ${anio}.xlsx"`,
    },
  });
}
