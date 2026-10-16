"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeRegistrarPermisos } from "@/lib/auth";
import { errorAccion as fail, type ResultadoAccion } from "@/lib/actions/resultado";
import { formatearHora } from "@/lib/permisos";
import { permisoFormSchema, type PermisoForm } from "@/lib/validations/permiso";

function ok(nit: string) {
  revalidatePath("/permisos");
  revalidatePath("/permisos/registrar");
  revalidatePath("/permisos/resumen");
  revalidatePath(`/permisos/${nit}`);
}

async function contexto() {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  const puede = await puedeRegistrarPermisos(usuario, supabase);
  return { usuario, supabase, puede };
}

function leer(formData: FormData): { error: string; datos?: never } | { error?: never; datos: PermisoForm } {
  const parsed = permisoFormSchema.safeParse({
    usuario_nit: formData.get("usuario_nit"),
    fecha: formData.get("fecha"),
    tipo: formData.get("tipo"),
    hora_inicio: formData.get("hora_inicio") ?? undefined,
    hora_fin: formData.get("hora_fin") ?? undefined,
    hora_llegada: formData.get("hora_llegada") ?? undefined,
    motivo: formData.get("motivo") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise los datos." };
  return { datos: parsed.data };
}

async function buscarCruce(supabase: Awaited<ReturnType<typeof createClient>>, d: PermisoForm, excluirId?: string) {
  let q = supabase
    .from("permisos_personal")
    .select("id, tipo, hora_inicio, hora_fin")
    .eq("usuario_nit", d.usuario_nit)
    .eq("fecha", d.fecha);
  if (excluirId) q = q.neq("id", excluirId);
  const { data } = await q;
  return (data ?? []).find((o) => {
    if (d.hora_inicio === null || o.hora_inicio === null) return d.tipo === o.tipo;
    return d.hora_inicio < o.hora_fin!.slice(0, 5) && o.hora_inicio.slice(0, 5) < d.hora_fin!;
  });
}

const mensajeCruce = (o: { hora_inicio: string | null; hora_fin: string | null }) =>
  o.hora_inicio
    ? `Esa persona ya tiene un registro ese día de ${formatearHora(o.hora_inicio)} a ${formatearHora(o.hora_fin)}. Revise si ya fue registrado.`
    : "Esa persona ya tiene una nota de marcaje ese día.";

export async function registrarPermiso(formData: FormData): Promise<ResultadoAccion> {
  const { usuario, supabase, puede } = await contexto();
  if (!puede) return fail("No tiene permiso para registrar permisos.");

  const r = leer(formData);
  if (r.error !== undefined) return fail(r.error);

  const cruce = await buscarCruce(supabase, r.datos);
  if (cruce) return fail(mensajeCruce(cruce));

  const { error } = await supabase.from("permisos_personal").insert({ ...r.datos, registrado_por_nit: usuario!.nit });
  if (error) return fail("No se pudo registrar el permiso.");

  ok(r.datos.usuario_nit);
}

export async function corregirPermiso(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get("id") ?? "");
  const { supabase, puede } = await contexto();
  if (!puede) return fail("No tiene permiso para corregir permisos.");
  if (!id) return fail("Falta identificar el registro.");

  const r = leer(formData);
  if (r.error !== undefined) return fail(r.error);

  const cruce = await buscarCruce(supabase, r.datos, id);
  if (cruce) return fail(mensajeCruce(cruce));

  const { usuario_nit, ...cambios } = r.datos;
  const { data, error } = await supabase
    .from("permisos_personal")
    .update(cambios)
    .eq("id", id)
    .eq("usuario_nit", usuario_nit)
    .select("id");
  if (error || !data?.length) return fail("No se pudo corregir el permiso.");

  ok(usuario_nit);
}

export async function eliminarPermiso(formData: FormData): Promise<ResultadoAccion> {
  const id = String(formData.get("id") ?? "");
  const { supabase, puede } = await contexto();
  if (!puede) return fail("No tiene permiso para eliminar permisos.");

  const { data, error } = await supabase.from("permisos_personal").delete().eq("id", id).select("usuario_nit");
  if (error || !data?.length) return fail("No se pudo eliminar el registro.");

  ok(data[0].usuario_nit);
}

export async function asignarEncargado(formData: FormData): Promise<ResultadoAccion> {
  const nit = String(formData.get("usuario_nit") ?? "");
  const usuario = await getUsuarioActual();
  if (usuario?.permiso_sistema !== "control_total") return fail("Solo Dirección puede asignar encargados.");
  if (!nit) return fail("Elija a la persona.");

  const supabase = await createClient();
  const { data: persona } = await supabase.from("usuarios").select("permiso_sistema, activo").eq("nit", nit).maybeSingle();
  if (!persona?.activo) return fail("No se encontró a la persona.");
  if (persona.permiso_sistema === "consulta") {
    return fail("Esa persona tiene acceso solo de consulta y no podría registrar. Pida que le cambien el acceso primero.");
  }

  const { error } = await supabase.from("permisos_encargados").insert({ usuario_nit: nit, asignado_por_nit: usuario.nit });
  if (error) return fail(error.code === "23505" ? "Esa persona ya es encargada." : "No se pudo asignar.");

  revalidatePath("/configuracion");
  revalidatePath("/permisos");
}

export async function quitarEncargado(formData: FormData): Promise<ResultadoAccion> {
  const nit = String(formData.get("usuario_nit") ?? "");
  const usuario = await getUsuarioActual();
  if (usuario?.permiso_sistema !== "control_total") return fail("Solo Dirección puede quitar encargados.");

  const supabase = await createClient();
  const { error } = await supabase.from("permisos_encargados").delete().eq("usuario_nit", nit);
  if (error) return fail("No se pudo quitar.");

  revalidatePath("/configuracion");
  revalidatePath("/permisos");
}
