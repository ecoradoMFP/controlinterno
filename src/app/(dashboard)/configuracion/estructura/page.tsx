import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agregarUnidad, cambiarActivaUnidad, renombrarUnidad } from "./actions";

const SELECT_CLASES = "h-9 rounded-lg border border-input bg-background px-3 text-sm";

export default async function EstructuraPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const usuario = await getUsuarioActual();
  if (!usuario || usuario.permiso_sistema !== "control_total") redirect("/reportes");

  const supabase = await createClient();
  const { data } = await supabase.from("unidades_ministerio").select("*").order("orden");
  const unidades = data ?? [];
  const hijas = (padreId: string | null) => unidades.filter((u) => u.padre_id === padreId);
  // Árbol aplanado con sangría: despacho -> (direcciones y viceministerios) -> direcciones.
  const filas: { unidad: (typeof unidades)[number]; nivel: number }[] = [];
  const recorrer = (padreId: string | null, nivel: number) => {
    for (const u of hijas(padreId)) {
      filas.push({ unidad: u, nivel });
      recorrer(u.id, nivel + 1);
    }
  };
  recorrer(null, 0);
  const posiblesPadres = unidades.filter((u) => u.activo && (!u.padre_id || hijas(u.id).length > 0));

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/configuracion" label="Volver a Configuración" />
      <div>
        <h1 className="text-xl font-semibold">Estructura organizacional del Ministerio</h1>
        <p className="text-sm text-muted-foreground">
          Alimenta el selector &quot;Dependencia auditada&quot;. Si una unidad cambia de nombre, edítala aquí; si deja de existir,
          desactívala. Los informes ya registrados conservan el nombre con el que se auditó.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="rounded-xl border shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-medium">Agregar unidad</h2>
        </div>
        <form action={agregarUnidad} className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex min-w-72 flex-1 flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="nombre">
              Nombre
            </label>
            <Input id="nombre" name="nombre" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="padre_id">
              Depende de
            </label>
            <select id="padre_id" name="padre_id" className={SELECT_CLASES} required>
              {posiblesPadres.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Agregar</Button>
        </form>
      </div>

      <div className="rounded-xl border shadow-sm">
        <div className="flex flex-col divide-y">
          {filas.map(({ unidad, nivel }) => (
            <div key={unidad.id} className="flex flex-wrap items-center gap-3 p-3" style={{ paddingLeft: `${0.75 + nivel * 1.5}rem` }}>
              <form action={renombrarUnidad} className="flex min-w-72 flex-1 items-center gap-2">
                <input type="hidden" name="id" value={unidad.id} />
                <Input name="nombre" defaultValue={unidad.nombre} required aria-label="Nombre de la unidad" className={unidad.activo ? "" : "text-muted-foreground line-through"} />
                <Button type="submit" variant="outline" size="sm">
                  Guardar
                </Button>
              </form>
              <form action={cambiarActivaUnidad}>
                <input type="hidden" name="id" value={unidad.id} />
                <input type="hidden" name="activo" value={String(!unidad.activo)} />
                <Button type="submit" variant="ghost" size="sm">
                  {unidad.activo ? "Desactivar" : "Reactivar"}
                </Button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
