import ExcelJS from "exceljs";
import {
  CATEGORIAS_TIEMPO,
  CATEGORIA_TITULO,
  MESES,
  TIPO_PERMISO_LABELS,
  formatearFechaPermiso,
  minutosPorMes,
  type RegistroResumen,
} from "@/lib/permisos";
import type { TipoPermisoPersonalEnum } from "@/types/domain";

export type DatosPermisosExcel = {
  anio: number;
  usuario: string;
  hoy: string;
  grupos: string[];
  personas: { nit: string; nombre: string; grupo: string }[];
  registros: (RegistroResumen & {
    fecha: string;
    hora_inicio: string | null;
    hora_fin: string | null;
    motivo: string;
  })[];
};

const AZUL = "FF1F3864";
const BORDE: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
  left: { style: "thin", color: { argb: "FFBFBFBF" } },
  right: { style: "thin", color: { argb: "FFBFBFBF" } },
};
const FORMATO_HORAS = "[h]:mm";
const aDia = (minutos: number) => minutos / 1440;
const horaExcel = (h: string | null) => {
  if (!h) return null;
  const [hh, mm] = h.split(":").map(Number);
  return aDia(hh * 60 + mm);
};

function cabecera(r: ExcelJS.Row) {
  r.height = 22;
  r.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = BORDE;
  });
}

function titulo(ws: ExcelJS.Worksheet, texto: string, columnas: number, tam = 12) {
  const r = ws.addRow([texto]);
  ws.mergeCells(r.number, 1, r.number, columnas);
  r.getCell(1).font = { bold: true, size: tam, color: { argb: AZUL } };
  r.getCell(1).alignment = { horizontal: "center" };
}

function tablaMeses(ws: ExcelJS.Worksheet, encabezado: string[], filas: { inicio: (string | number)[]; minutos: number[] }[], etiquetaTotal: string) {
  cabecera(ws.addRow([...encabezado, ...MESES.map((m) => m.toUpperCase()), "TOTAL"]));
  const desde = encabezado.length + 1;
  const primera = ws.rowCount + 1;
  for (const f of filas) {
    const r = ws.addRow([...f.inicio, ...f.minutos.map(aDia)]);
    const total = r.getCell(desde + 12);
    total.value = { formula: `SUM(${r.getCell(desde).address}:${r.getCell(desde + 11).address})`, result: aDia(f.minutos.reduce((a, b) => a + b, 0)) };
    total.font = { bold: true };
    r.eachCell({ includeEmpty: true }, (c, n) => {
      c.border = BORDE;
      if (n >= desde) c.numFmt = FORMATO_HORAS;
    });
  }
  const ultima = ws.rowCount;
  const t = ws.addRow([etiquetaTotal]);
  for (let i = 0; i <= 12; i++) {
    const c = t.getCell(desde + i);
    const col = ws.getColumn(desde + i).letter;
    const suma = filas.reduce((acc, f) => acc + (i < 12 ? f.minutos[i] : f.minutos.reduce((a, b) => a + b, 0)), 0);
    c.value = filas.length ? { formula: `SUM(${col}${primera}:${col}${ultima})`, result: aDia(suma) } : 0;
    c.numFmt = FORMATO_HORAS;
  }
  t.eachCell({ includeEmpty: true }, (c) => {
    c.font = { bold: true };
    c.border = BORDE;
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5F9FF" } };
  });
  ws.addRow([]);
}

export async function generarPermisosXlsx(d: DatosPermisosExcel) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SCIDAI";
  const grupoDe = new Map(d.personas.map((p) => [p.nit, p.grupo]));
  const pie = `Generado por SCIDAI el ${d.hoy.split("-").reverse().join("/")} · ${d.usuario}`;

  const ws1 = wb.addWorksheet("Consolidado", { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws1.columns = [{ width: 30 }, ...MESES.map(() => ({ width: 11 })), { width: 11 }];
  titulo(ws1, "DIRECCIÓN DE AUDITORÍA INTERNA", 14, 13);
  titulo(ws1, `CONTROL DE PERMISOS ${d.anio}`, 14);
  ws1.addRow([]);
  for (const c of CATEGORIAS_TIEMPO) {
    titulo(ws1, CATEGORIA_TITULO[c].toUpperCase(), 14, 11);
    tablaMeses(
      ws1,
      ["DIRECCIÓN Y DEPARTAMENTOS"],
      d.grupos.map((g) => ({ inicio: [g], minutos: minutosPorMes(d.registros.filter((r) => grupoDe.get(r.usuario_nit) === g), c) })),
      "TOTAL",
    );
  }
  ws1.addRow([pie]).getCell(1).font = { italic: true, size: 9, color: { argb: "FF808080" } };

  const ws2 = wb.addWorksheet("Por persona", { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws2.columns = [{ width: 6 }, { width: 42 }, { width: 11 }, ...MESES.map(() => ({ width: 11 })), { width: 11 }];
  titulo(ws2, `CONTROL DE PERMISOS ${d.anio} POR PERSONA`, 16, 13);
  ws2.addRow([]);
  for (const c of CATEGORIAS_TIEMPO) {
    titulo(ws2, CATEGORIA_TITULO[c].toUpperCase(), 16, 11);
    tablaMeses(
      ws2,
      ["NO.", "NOMBRES Y APELLIDOS", "DEPTO."],
      d.personas.map((p, i) => ({ inicio: [i + 1, p.nombre, p.grupo], minutos: minutosPorMes(d.registros.filter((r) => r.usuario_nit === p.nit), c) })),
      "TOTAL",
    );
  }

  const ws3 = wb.addWorksheet("Detalle");
  ws3.columns = [{ width: 12 }, { width: 18 }, { width: 42 }, { width: 10 }, { width: 18 }, { width: 9 }, { width: 9 }, { width: 10 }, { width: 50 }];
  cabecera(ws3.addRow(["FECHA", "DÍA Y FECHA", "NOMBRES Y APELLIDOS", "DEPTO.", "TIPO", "DE", "A", "TOTAL", "MOTIVO"]));
  const nombreDe = new Map(d.personas.map((p) => [p.nit, p.nombre]));
  const orden = [...d.registros].sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""));
  for (const r of orden) {
    const [y, m, dd] = r.fecha.split("-").map(Number);
    const fila = ws3.addRow([
      new Date(Date.UTC(y, m - 1, dd)),
      formatearFechaPermiso(r.fecha).toUpperCase(),
      nombreDe.get(r.usuario_nit) ?? r.usuario_nit,
      grupoDe.get(r.usuario_nit) ?? "",
      TIPO_PERMISO_LABELS[r.tipo as TipoPermisoPersonalEnum],
      horaExcel(r.hora_inicio),
      horaExcel(r.hora_fin),
      r.hora_inicio ? aDia(r.minutos ?? 0) : null,
      r.motivo,
    ]);
    fila.getCell(1).numFmt = "dd/mm/yyyy";
    fila.getCell(6).numFmt = "h:mm";
    fila.getCell(7).numFmt = "h:mm";
    fila.getCell(8).numFmt = FORMATO_HORAS;
    fila.eachCell({ includeEmpty: true }, (c) => (c.border = BORDE));
  }
  ws3.autoFilter = { from: "A1", to: "I1" };
  ws3.views = [{ state: "frozen", ySplit: 1 }];

  return Buffer.from(await wb.xlsx.writeBuffer());
}
