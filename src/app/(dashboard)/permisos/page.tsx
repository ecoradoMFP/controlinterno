import Link from "next/link";
import { CalendarDays, Download, Plus } from "lucide-react";
import { hoyGuatemala } from "@/lib/recomendaciones";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FiltrosAutomaticos } from "@/components/recomendaciones/filtros-automaticos";
import { ResumenTotales } from "@/components/permisos/resumen-totales";
import { CATEGORIAS_TIEMPO, CATEGORIA_TITULO, MESES, formatearMinutos, totalesPor, totalesVacios, type RegistroResumen } from "@/lib/permisos";
import { accesoPermisos, cargarPersonal, ORDEN_GRUPOS } from "./datos";

const RUTA = "/permisos";
const SELECT_CLASES = "h-10 rounded-lg border border-input bg-background px-3 text-sm";
const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const COLUMNA: Record<(typeof CATEGORIAS_TIEMPO)[number], string> = {
  asunto_personal: "Permisos personales",
  cita_medica: "Citas médicas",
  entrada_tardia: "Entradas tarde",
};

export default async function PermisosPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string; grupo?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, registra } = await accesoPermisos();

  const anioActual = Number(hoyGuatemala().slice(0, 4));
  const anio = Number(sp.anio) || anioActual;
  const mes = Number(sp.mes) >= 1 && Number(sp.mes) <= 12 ? Number(sp.mes) : null;
  const grupo = sp.grupo && ORDEN_GRUPOS.includes(sp.grupo) ? sp.grupo : null;
  const q = sp.q?.trim() ?? "";

  const [{ personal, grupoDe, grupos }, { data: registrosAnio }] = await Promise.all([
    cargarPersonal(supabase),
    supabase.from("permisos_personal").select("usuario_nit, tipo, minutos, mes").eq("anio", anio),
  ]);

  const enGrupo = (nit: string) => grupoDe.has(nit) && (!grupo || grupoDe.get(nit) === grupo);
  const registros: RegistroResumen[] = (registrosAnio ?? []).filter((r) => enGrupo(r.usuario_nit) && (!mes || r.mes === mes));
  const total = totalesPor(registros, () => 0).get(0) ?? totalesVacios();
  const porPersona = totalesPor(registros, (r) => r.usuario_nit);

  const filas = personal
    .filter((p) => enGrupo(p.nit) && (q ? sinTildes(p.nombre).includes(sinTildes(q)) : porPersona.has(p.nit)))
    .map((p) => ({ ...p, grupo: grupoDe.get(p.nit)!, t: porPersona.get(p.nit) ?? totalesVacios() }))
    .sort((a, b) => b.t.minutos.asunto_personal - a.t.minutos.asunto_personal || a.nombre.localeCompare(b.nombre));
  const sinRegistros = personal.filter((p) => enGrupo(p.nit) && !porPersona.has(p.nit)).length;

  const periodo = `${mes ? `${MESES[mes - 1]} de ` : "Todo "}${anio}${grupo ? ` · ${grupo}` : ""}`;
  const hayFiltros = !!(sp.anio || mes || grupo || q);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Permisos y llegadas tarde</h1>
          <p className="text-sm text-muted-foreground">
            {registra ? "Registre aquí los permisos del personal." : "Solo consulta. El registro lo lleva la persona encargada."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {registra ? (
            <Button nativeButton={false} render={<Link href="/permisos/registrar" />}>
              <Plus />
              Registrar un permiso
            </Button>
          ) : null}
          <Button variant="outline" nativeButton={false} render={<Link href={`/permisos/resumen?anio=${anio}`} />}>
            <CalendarDays />
            Resumen por mes
          </Button>
          <Button variant="outline" nativeButton={false} render={<a href={`/permisos/reporte?anio=${anio}`} />}>
            <Download />
            Descargar Excel
          </Button>
        </div>
      </div>

      <div className="tarjeta">
        <FiltrosAutomaticos ruta={RUTA} className="flex flex-wrap items-end gap-3 border-b p-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Año
            <select name="anio" defaultValue={String(anio)} className={SELECT_CLASES}>
              {[anioActual, anioActual - 1, anioActual - 2].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Mes
            <select name="mes" defaultValue={mes ? String(mes) : ""} className={SELECT_CLASES}>
              <option value="">Todo el año</option>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          {grupos.length > 1 ? (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Área
              <select name="grupo" defaultValue={grupo ?? ""} className={SELECT_CLASES}>
                <option value="">Todas</option>
                {grupos.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-medium sm:max-w-sm">
            Buscar persona
            <input name="q" type="text" defaultValue={q} placeholder="Escriba un nombre" className={`${SELECT_CLASES} font-normal`} />
          </label>
          {hayFiltros ? (
            <Button variant="outline" className="h-10" nativeButton={false} render={<Link href={RUTA} />}>
              Quitar filtros
            </Button>
          ) : null}
        </FiltrosAutomaticos>

        <div className="p-4">
          <ResumenTotales totales={total} periodo={periodo} />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Por persona</h2>
        <div className="tarjeta overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                {CATEGORIAS_TIEMPO.map((c) => (
                  <TableHead key={c} className="text-right" title={CATEGORIA_TITULO[c]}>
                    {COLUMNA[c]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    {q ? "Nadie coincide con esa búsqueda." : "No hay permisos registrados en este periodo."}
                  </TableCell>
                </TableRow>
              ) : (
                filas.map((p) => (
                  <TableRow key={p.nit}>
                    <TableCell>
                      <Link href={`/permisos/${encodeURIComponent(p.nit)}?anio=${anio}`} className="font-medium text-primary hover:underline">
                        {p.nombre}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{p.grupo}</span>
                    </TableCell>
                    {CATEGORIAS_TIEMPO.map((c) => (
                      <TableCell key={c} className="text-right tabular-nums">
                        {p.t.veces[c] > 0 ? (
                          <>
                            <span className="font-medium">{formatearMinutos(p.t.minutos[c])} h</span>
                            <span className="block text-xs text-muted-foreground">{p.t.veces[c] === 1 ? "1 vez" : `${p.t.veces[c]} veces`}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground/60">Ninguno</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground">
          Haga clic en un nombre para ver el detalle{registra ? " y corregir registros" : ""}.
          {!q && sinRegistros > 0 ? ` ${sinRegistros === 1 ? "Otra persona no tiene" : `Otras ${sinRegistros} personas no tienen`} registros en este periodo; búsquela por nombre para verla.` : ""}
        </p>
      </section>
    </div>
  );
}
