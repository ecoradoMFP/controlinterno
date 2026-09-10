import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CapacitacionKpiCards } from "@/components/capacitaciones/kpi-cards";
import { DepartamentoCapacitacionChart, type FilaDepartamentoCapacitacion } from "@/components/capacitaciones/departamento-chart";
import { PersonalCapacitacionTable, type FilaPersonalCapacitacion } from "@/components/capacitaciones/personal-table";
import { HORAS_OBJETIVO_ANUAL } from "@/lib/capacitacion";

const SIN_DEPARTAMENTO = "Sin departamento";

export default async function CapacitacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; error?: string }>;
}) {
  const { anio: anioParam, error } = await searchParams;
  const anioActual = new Date().getUTCFullYear();
  const anio = anioParam ? Number(anioParam) : anioActual;

  const supabase = await createClient();

  // Sin filtro de departamento en ninguna consulta: RLS (usuarios_select, capacitaciones_select)
  // ya devuelve solo lo que está dentro del alcance del usuario actual, igual que /documentos
  // y /reportes.
  const [{ data: personal }, { data: capacitaciones }] = await Promise.all([
    supabase
      .from("usuarios")
      .select("nit, nombre, activo, departamento_id, departamentos(nombre)")
      .eq("activo", true)
      .order("nombre"),
    supabase.from("capacitaciones").select("usuario_nit, horas").eq("anio", anio),
  ]);

  const horasPorPersona = new Map<string, number>();
  for (const c of capacitaciones ?? []) {
    horasPorPersona.set(c.usuario_nit, (horasPorPersona.get(c.usuario_nit) ?? 0) + Number(c.horas));
  }

  const filas: FilaPersonalCapacitacion[] = (personal ?? []).map((p) => ({
    nit: p.nit,
    nombre: p.nombre,
    departamento: p.departamentos?.nombre ?? null,
    horasAcumuladas: horasPorPersona.get(p.nit) ?? 0,
  }));

  const totalPersonas = filas.length;
  const personasCumplidas = filas.filter((f) => f.horasAcumuladas >= HORAS_OBJETIVO_ANUAL).length;
  const personasSinRegistro = filas.filter((f) => f.horasAcumuladas <= 0).length;
  const horasPromedio = totalPersonas > 0 ? filas.reduce((acc, f) => acc + f.horasAcumuladas, 0) / totalPersonas : 0;

  const porDepartamento = new Map<string, { totalHoras: number; personas: number }>();
  for (const f of filas) {
    const clave = f.departamento ?? SIN_DEPARTAMENTO;
    const actual = porDepartamento.get(clave) ?? { totalHoras: 0, personas: 0 };
    actual.totalHoras += f.horasAcumuladas;
    actual.personas += 1;
    porDepartamento.set(clave, actual);
  }
  const datosDepartamento: FilaDepartamentoCapacitacion[] = [...porDepartamento.entries()].map(([departamento, v]) => ({
    departamento,
    horasPromedio: v.personas > 0 ? v.totalHoras / v.personas : 0,
    personas: v.personas,
  }));

  const anios = [anioActual, anioActual - 1, anioActual - 2];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Capacitaciones</h1>
          <p className="text-sm text-muted-foreground">
            Cumplimiento de la norma de {HORAS_OBJETIVO_ANUAL} horas de capacitación anual por persona.
          </p>
        </div>
        <div className="flex gap-2">
          {anios.map((a) => (
            <Button key={a} variant={a === anio ? "default" : "outline"} render={<Link href={`/capacitaciones?anio=${a}`} />}>
              {a}
            </Button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <CapacitacionKpiCards
        totalPersonas={totalPersonas}
        personasCumplidas={personasCumplidas}
        personasSinRegistro={personasSinRegistro}
        horasPromedio={horasPromedio}
      />

      <div className="rounded-lg border">
        <div className="border-b p-4">
          <h2 className="font-medium">Horas promedio por departamento</h2>
        </div>
        <DepartamentoCapacitacionChart datos={datosDepartamento} />
      </div>

      <PersonalCapacitacionTable filas={filas} />
    </div>
  );
}
