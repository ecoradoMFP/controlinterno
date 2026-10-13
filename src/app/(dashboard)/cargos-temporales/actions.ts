"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual, puedeRegistrarCargoTemporal } from "@/lib/auth";

const RUTA = "/cargos-temporales";

function fail(message: string): never {
  redirect(`${RUTA}?error=${encodeURIComponent(message)}`);
}

// Defensa en profundidad: RLS (`cargos_temporales_insert/update`) y el trigger
// `cargos_temporales_validar` ya lo exigen; aquí se verifica antes para dar un mensaje claro.
async function requiereDireccion() {
  const usuario = await getUsuarioActual();
  if (!usuario || !puedeRegistrarCargoTemporal(usuario)) {
    fail("Solo el Director o el Subdirector registran cargos temporales.");
  }
  return usuario;
}

export async function registrarCargoTemporal(formData: FormData) {
  const usuario = await requiereDireccion();

  const usuarioNit = String(formData.get("usuario_nit") ?? "");
  const cargo = String(formData.get("cargo") ?? "");
  const departamentoId = String(formData.get("departamento_id") ?? "");
  const fechaInicio = String(formData.get("fecha_inicio") ?? "");
  const fechaFin = String(formData.get("fecha_fin") ?? "");
  const documento = String(formData.get("documento_respaldo") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!usuarioNit || !departamentoId || !fechaInicio || !fechaFin || !documento) {
    fail("Completa la persona, el cargo, el departamento, las fechas y el documento de la ampliación.");
  }
  if (cargo !== "subjefe" && cargo !== "jefe") fail("El cargo temporal debe ser Subjefe o Jefe.");
  if (fechaFin < fechaInicio) fail("La fecha de fin no puede ser anterior a la de inicio.");
  if (motivo.length < 10) fail("Escribe el motivo (al menos 10 caracteres).");

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
  const usuario = await requiereDireccion();

  const id = String(formData.get("id") ?? "");
  const motivo = String(formData.get("motivo_revocacion") ?? "").trim();
  if (motivo.length < 10) fail("Escribe el motivo para terminarlo antes (al menos 10 caracteres).");

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
