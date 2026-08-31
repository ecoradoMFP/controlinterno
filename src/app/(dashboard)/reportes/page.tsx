import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calcularSemaforo,
  peorColor,
  UMBRAL_POR_DEFECTO,
  COLOR_SEMAFORO_CLASSES,
  COLOR_SEMAFORO_LABELS,
  type ColorSemaforo,
  type UmbralSemaforo,
} from "@/lib/semaforo";

const COLORES: ColorSemaforo[] = ["verde", "amarillo", "naranja", "rojo"];

export default async function ReportesPage() {
  const supabase = await createClient();

  // Sin filtro explícito en ninguna de las 3 consultas: RLS (actividades_select, hitos_select,
  // oficios_select) ya devuelve solo lo que está dentro del alcance del usuario actual, igual
  // que en /documentos.
  const [
    { data: actividades },
    { data: hitosAbiertos },
    { data: oficiosAbiertos },
    { data: parametros },
    { data: feriadosRows },
  ] = await Promise.all([
    supabase
      .from("actividades")
      .select("id, no_nombramiento, dependencia_auditada, departamentos(nombre)")
      .order("no_nombramiento"),
    supabase
      .from("hitos_cronograma")
      .select("actividad_id, fecha_inicio_esperada, fecha_fin_esperada")
      .is("fecha_fin_real", null),
    supabase
      .from("oficios")
      .select("actividad_id, fecha_emision, fecha_vencimiento")
      .is("fecha_respuesta", null)
      .not("fecha_vencimiento", "is", null)
      .not("actividad_id", "is", null),
    supabase.from("parametros_semaforo").select("*"),
    supabase.from("calendario_feriados").select("fecha"),
  ]);

  const feriados = new Set((feriadosRows ?? []).map((f) => f.fecha));
  const umbralPorAmbito = new Map((parametros ?? []).map((p) => [p.ambito, p as UmbralSemaforo]));
  const umbralHito = umbralPorAmbito.get("hito") ?? UMBRAL_POR_DEFECTO;
  const umbralOficio = umbralPorAmbito.get("oficio") ?? UMBRAL_POR_DEFECTO;
  const hoy = new Date().toISOString().slice(0, 10);

  // Sección 5: a nivel de actividad el semáforo es el peor caso entre todos sus hitos/oficios
  // abiertos, nunca un promedio.
  const colorPorActividad = new Map<string, ColorSemaforo>();
  function acumular(actividadId: string | null, color: ColorSemaforo) {
    if (!actividadId) return;
    const actual = colorPorActividad.get(actividadId);
    colorPorActividad.set(actividadId, actual ? peorColor(actual, color) : color);
  }

  for (const h of hitosAbiertos ?? []) {
    acumular(h.actividad_id, calcularSemaforo(h.fecha_inicio_esperada, h.fecha_fin_esperada, hoy, feriados, umbralHito));
  }
  for (const o of oficiosAbiertos ?? []) {
    if (!o.fecha_vencimiento) continue;
    acumular(o.actividad_id, calcularSemaforo(o.fecha_emision, o.fecha_vencimiento, hoy, feriados, umbralOficio));
  }

  const conteo: Record<ColorSemaforo, number> = { verde: 0, amarillo: 0, naranja: 0, rojo: 0 };
  for (const color of colorPorActividad.values()) conteo[color]++;
  const totalConDato = colorPorActividad.size;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Semáforo por actividad: peor caso entre sus hitos y oficios abiertos (sección 5). Las
          actividades sin hitos u oficios capturados todavía no tienen semáforo activo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COLORES.map((color) => (
          <div key={color} className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{COLOR_SEMAFORO_LABELS[color]}</p>
            <p className="text-2xl font-semibold">{conteo[color]}</p>
            <p className="text-xs text-muted-foreground">
              {totalConDato > 0 ? `${Math.round((conteo[color] / totalConDato) * 100)}%` : "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actividad</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Semáforo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actividades && actividades.length > 0 ? (
              actividades.map((a) => {
                const color = colorPorActividad.get(a.id);
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/actividades/${a.id}`} className="font-medium hover:underline">
                        {a.no_nombramiento}
                      </Link>
                      <p className="text-xs text-muted-foreground">{a.dependencia_auditada}</p>
                    </TableCell>
                    <TableCell>{a.departamentos?.nombre ?? "—"}</TableCell>
                    <TableCell>
                      {color ? (
                        <Badge className={COLOR_SEMAFORO_CLASSES[color]}>{COLOR_SEMAFORO_LABELS[color]}</Badge>
                      ) : (
                        <Badge variant="outline">Sin datos</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  No hay actividades dentro de tu alcance todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
