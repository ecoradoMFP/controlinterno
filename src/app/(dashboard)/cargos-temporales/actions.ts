"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { departamentosCargoTemporal, getUsuarioActual } from "@/lib/auth";

const RUTA = "/cargos-temporales";

function fail(message: string): never {
  redirect(`${RUTA}?error=${encodeURIComponent(message)}`);
}

async function requiereJefatura() {
  const usuario = await getUsuarioActual();
  const departamentos = departamentosCargoTemporal(usuario);
  if (!usuario || !departamentos) {
    fail("Los cargos temporales los registran el Director, el Subdirector, el Jefe o el Subjefe.");
  }
  return { usuario, departamentos };
}

export async function registrarCargoTemporal(formData: FormData) {
  const { usuario, departamentos } = await requiereJefatura();

  const usuarioNit = String(formData.get("usuario_nit") ?? "");
  const cargo = String(formData.get("cargo") ?? "");
  const departamentoId = String(formData.get("departamento_id") ?? "");
  const fechaInicio = String(formData.get("fecha_inicio") ?? "");
  const fechaFin = String(formData.get("fecha_fin") ?? "");
  const documento = String(formData.get("documento_respaldo") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!usuarioNit || !departamentoId || !fechaInicio || !fechaFin || !documento) {
    fail("Complete la persona, el cargo, el departamento, las fechas y el documento de la ampliación.");
  }
  if (cargo !== "subjefe" && cargo !== "jefe") fail("El cargo temporal debe ser Subjefe o Jefe.");
  if (departamentos !== "todos" && !departamentos.includes(departamentoId)) {
    fail("Solo puede registrar cargos temporales de su propio departamento.");
  }
  if (usuarioNit === usuario.nit) fail("No puede registrarse un cargo temporal a sí mismo.");
  if (fechaFin < fechaInicio) fail("La fecha de fin no puede ser anterior a la de inicio.");
  if (motivo.length < 10) fail("Escriba el motivo (al menos 10 caracteres).");

  const supabase = await createClient();
  const { error } = await supabase.from("cargos_temporales").insert({
    usuario_nit: usuarioNit,
    cargo,
    departamento_id: departamentoId,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    documento_respaldo: documento,
    motivo,
    registrado_por_nit: usuario.nit,
  });

  if (error) {
    fail(error.message.includes("ya tiene un cargo temporal") ? "Esa persona ya tiene un cargo temporal en esas fechas." : "No se pudo registrar el cargo temporal.");
  }

  revalidatePath(RUTA);
  redirect(RUTA);
}

export async function revocarCargoTemporal(formData: FormData) {
  const { usuario } = await requiereJefatura();

  const id = String(formData.get("id") ?? "");
  const motivo = String(formData.get("motivo_revocacion") ?? "").trim();
  if (motivo.length < 10) fail("Escriba el motivo para terminarlo antes (al menos 10 caracteres).");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cargos_temporales")
    .update({ revocado_en: new Date().toISOString(), revocado_por_nit: usuario.nit, motivo_revocacion: motivo })
    .eq("id", id)
    .is("revocado_en", null)
    .select("id");

  if (error || !data?.length) fail("No se pudo terminar el cargo temporal.");

  revalidatePath(RUTA);
  redirect(RUTA);
}
