import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";
import { cargarReporte, generarReporteDocx, generarReporteXlsx, type FiltrosReporte } from "@/lib/recomendaciones-reporte";

export async function GET(request: Request) {
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  if (!usuario) return new Response("No autenticado", { status: 401 });

  const p = new URL(request.url).searchParams;
  const filtros: FiltrosReporte = {
    etapa: p.get("etapa") ?? undefined,
    estado: p.get("estado") ?? undefined,
    dependencia: p.get("dependencia") ?? undefined,
    departamento: p.get("departamento") ?? undefined,
    anio: p.get("anio") ?? undefined,
    q: p.get("q") ?? undefined,
  };
  const formato = p.get("formato") === "docx" ? "docx" : "xlsx";

  const filas = await cargarReporte(supabase, filtros);
  let departamento = "";
  if (filtros.departamento) {
    const { data } = await supabase.from("departamentos").select("nombre").eq("id", filtros.departamento).maybeSingle();
    departamento = data?.nombre ?? "";
  }
  const meta = { usuario: usuario.nombre, departamento };
  const nombre = `Reporte estado de recomendaciones ${new Date().toISOString().slice(0, 10)}`;

  if (formato === "docx") {
    const buffer = await generarReporteDocx(filas, filtros, meta);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${nombre}.docx"`,
      },
    });
  }
  const buffer = await generarReporteXlsx(filas, filtros, meta);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}.xlsx"`,
    },
  });
}
