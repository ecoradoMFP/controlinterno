import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";
import { cargarCedulaDocumento } from "@/lib/recomendaciones-datos";
import { generarCedulaDocx } from "@/lib/recomendaciones-cedula-docx";

// Exporta la cédula de seguimiento a Word para editarla/firmarla fuera del sistema. Usa el mismo
// cargador que la pantalla: lo que RLS no deja ver, tampoco se exporta.
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [usuario, supabase] = await Promise.all([getUsuarioActual(), createClient()]);
  if (!usuario) return new Response("No autenticado", { status: 401 });

  const cedula = await cargarCedulaDocumento(supabase, id);
  if (!cedula) return new Response("No encontrado", { status: 404 });

  const buffer = await generarCedulaDocx(cedula);
  const nombre = `Cedula de seguimiento ${cedula.documento.no_documento ?? cedula.documento.no_nombramiento ?? id}`.replace(/[^\w .-]/g, "_");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombre}.docx"`,
    },
  });
}
