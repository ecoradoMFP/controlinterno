import ExcelJS from "exceljs";
import { cumplidoATiempo } from "@/lib/semaforo";
import { ETAPA_ACTIVIDAD_LABELS, type EtapaDocumentoEnum } from "@/types/domain";

export type DatosCronogramaExcel = {
  cai: string;
  dependencia: string;
  tipo: string;
  departamento: string;
  nombramiento: string;
  area: string | null;
  periodoInicio: string;
  periodoFin: string;
  auditorPrincipal: string;
  hoy: string;
  usuario: string;
  actividades: {
    codigo: string;
    nombre: string;
    etapa: EtapaDocumentoEnum;
    del: string;
    al: string;
    dias: number;
    real: string | null;
  }[];
  asuetos: { fecha: string; descripcion: string }[];
};

const dma = (iso: string) => iso.split("-").reverse().join("/");
const AZUL = "FF1F3864";

export async function generarCronogramaXlsx(d: DatosCronogramaExcel) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SCIDAI";
  const ws = wb.addWorksheet("Cronograma", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 1 as unknown as ExcelJS.PaperSize },
  });
  ws.columns = [{ width: 6 }, { width: 46 }, { width: 26 }, { width: 13 }, { width: 13 }, { width: 11 }, { width: 26 }];
  const COLS = 7;

  const linea = (texto: string, o: { tam?: number; negrita?: boolean; centro?: boolean; color?: string } = {}) => {
    const r = ws.addRow([texto]);
    ws.mergeCells(r.number, 1, r.number, COLS);
    const c = r.getCell(1);
    c.font = { bold: o.negrita ?? false, size: o.tam ?? 11, color: { argb: o.color ?? "FF000000" } };
    c.alignment = { horizontal: o.centro ? "center" : "left", vertical: "middle", wrapText: true };
    return r;
  };

  linea("MINISTERIO DE FINANZAS PÚBLICAS", { tam: 13, negrita: true, centro: true, color: AZUL });
  linea("DIRECCIÓN DE AUDITORÍA INTERNA", { tam: 12, negrita: true, centro: true, color: AZUL });
  linea("CRONOGRAMA DE ACTIVIDADES", { tam: 12, negrita: true, centro: true, color: AZUL });
  ws.addRow([]);
  linea(`Entidad: Ministerio de Finanzas Públicas`);
  linea(`Dependencia: ${d.dependencia}`);
  linea(`Tipo de auditoría: ${d.tipo}`);
  linea(`Código de Auditoría Interna -CAI-: ${d.cai}`);
  linea(`Nombramiento: ${d.nombramiento} · ${d.departamento}`);
  if (d.area) linea(`Área: ${d.area}`);
  linea(`Período: del ${dma(d.periodoInicio)} al ${dma(d.periodoFin)}`);
  ws.addRow([]);

  const cab = ws.addRow(["No.", "Actividad", "Etapa", "Del", "Al", "Días hábiles", "Estado (SCIDAI)"]);
  cab.height = 28;
  cab.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  const borde: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFBFBFBF" } },
    bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
    left: { style: "thin", color: { argb: "FFBFBFBF" } },
    right: { style: "thin", color: { argb: "FFBFBFBF" } },
  };
  for (const a of d.actividades) {
    const estado = a.real
      ? `Concluida el ${dma(a.real)} (${cumplidoATiempo(a.al, a.real) ? "a tiempo" : "tarde"})`
      : d.hoy > a.al
        ? "Plazo vencido"
        : d.hoy >= a.del
          ? "En curso"
          : "Por iniciar";
    const r = ws.addRow([a.codigo, a.nombre, ETAPA_ACTIVIDAD_LABELS[a.etapa], dma(a.del), dma(a.al), a.dias, estado]);
    r.eachCell((c, n) => {
      c.border = borde;
      c.alignment = { vertical: "middle", horizontal: n === 2 || n === 3 || n === 7 ? "left" : "center", wrapText: true };
    });
  }
  const total = ws.addRow(["", "Total de días hábiles para realizar la auditoría", "", "", "", d.actividades.reduce((s, a) => s + a.dias, 0), ""]);
  total.eachCell((c) => {
    c.font = { bold: true };
    c.border = borde;
  });
  total.getCell(6).alignment = { horizontal: "center" };
  ws.addRow([]);

  if (d.asuetos.length > 0) {
    linea(`Días de asueto en el período: ${d.asuetos.map((x) => `${dma(x.fecha)} (${x.descripcion})`).join("; ")}.`, { tam: 10 });
    ws.addRow([]);
  }

  ws.addRow([]);
  ws.addRow([]);
  const firmas = ws.addRow(["", "(f) ________________________________", "", "", "(f) ________________________________"]);
  ws.mergeCells(firmas.number, 5, firmas.number, COLS);
  const nombres = ws.addRow(["", `Elaborado por: ${d.auditorPrincipal}`, "", "", "Revisado por: Subjefe del Departamento"]);
  ws.mergeCells(nombres.number, 5, nombres.number, COLS);
  ws.addRow(["", "Auditor", "", "", ""]);
  ws.addRow([]);
  linea(`Generado por SCIDAI el ${dma(d.hoy)} · ${d.usuario}`, { tam: 9, color: "FF595959" });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
