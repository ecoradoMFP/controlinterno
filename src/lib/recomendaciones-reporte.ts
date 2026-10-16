import ExcelJS from "exceljs";
import {
  AlignmentType, Document, Footer, Header, PageNumber, PageOrientation, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import type { createClient } from "@/lib/supabase/server";
import { cargarRecomendaciones, type FilaRecomendacion } from "@/lib/recomendaciones-datos";
import { etiquetaCai } from "@/lib/recomendaciones";
import { ESTADO_RECOMENDACION_LABELS, type EstadoRecomendacionEnum } from "@/types/domain";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type FiltrosReporte = {
  etapa?: string;
  estado?: string;
  dependencia?: string;
  departamento?: string;
  anio?: string;
  q?: string;
};

export type FilaReporte = {
  cai: string;
  departamento: string;
  dependencia: string;
  tipoAuditoria: string;
  deficiencia: string;
  recomendacion: string;
  responsables: string | null;
  fechaImplementacion: string | null;
  estado: EstadoRecomendacionEnum;
  seguimientos: {
    numero: number;
    estado: EstadoRecomendacionEnum;
    informe: string | null;
    fecha: string | null;
    acciones: string | null;
    comentario: string | null;
  }[];
};

const ETAPAS_TITULO: Record<string, string> = {
  accion: "Requieren seguimiento",
  todas: "Todas las recomendaciones",
  por_evaluar: "Por evaluar",
  evaluada: "Evaluadas (falta el informe)",
  en_seguimiento: "En seguimiento este año",
  atendida: "Atendidas",
};

function aplicaFiltros(f: FilaRecomendacion, filtros: FiltrosReporte) {
  const etapa = filtros.etapa || "accion";
  if (etapa === "accion") {
    if (f.etapa !== "por_evaluar" && f.etapa !== "evaluada") return false;
  } else if (etapa !== "todas" && f.etapa !== etapa) return false;
  if (filtros.estado && f.estado_actual !== filtros.estado) return false;
  if (filtros.dependencia && f.informe.dependencia_auditada !== filtros.dependencia) return false;
  if (filtros.departamento && f.informe.departamento_id !== filtros.departamento) return false;
  if (filtros.anio && String(f.informe.anio_cai) !== filtros.anio) return false;
  const q = (filtros.q ?? "").trim().toLowerCase();
  if (q) {
    const texto = [f.informe.cai, f.informe.no_nombramiento, f.informe.dependencia_auditada, f.deficiencia.titulo, f.texto].join(" ").toLowerCase();
    if (!texto.includes(q)) return false;
  }
  return true;
}

export async function cargarReporte(supabase: SupabaseServerClient, filtros: FiltrosReporte) {
  const filas = (await cargarRecomendaciones(supabase)).filter((f) => aplicaFiltros(f, filtros));
  const ids = filas.map((f) => f.id);
  const { data: detalle } = ids.length
    ? await supabase
        .from("recomendaciones")
        .select(
          `id, responsables,
           deficiencias(descripcion, informes_auditoria(tipo_auditoria)),
           seguimientos_recomendacion(numero_seguimiento, estado, acciones_responsables, comentario_auditoria,
             documentos_seguimiento(no_documento, fecha_documento, no_nombramiento, fecha_nombramiento))`,
        )
        .in("id", ids)
    : { data: [] };
  const porId = new Map((detalle ?? []).map((d) => [d.id, d]));

  const salida: FilaReporte[] = filas.map((f) => {
    const d = porId.get(f.id);
    return {
      cai: etiquetaCai(f.informe.cai, f.informe.anio_cai) ?? f.informe.no_nombramiento ?? "—",
      departamento: f.informe.departamentos?.nombre ?? "",
      dependencia: f.informe.dependencia_auditada,
      tipoAuditoria: d?.deficiencias?.informes_auditoria?.tipo_auditoria ?? "",
      deficiencia: [f.deficiencia.titulo, d?.deficiencias?.descripcion].filter(Boolean).join("\n"),
      recomendacion: f.texto,
      responsables: d?.responsables ?? null,
      fechaImplementacion: f.fecha_implementacion,
      estado: f.estado_actual,
      seguimientos: [...(d?.seguimientos_recomendacion ?? [])]
        .filter((s) => s.numero_seguimiento > 0)
        .sort((a, b) => a.numero_seguimiento - b.numero_seguimiento)
        .map((s) => ({
          numero: s.numero_seguimiento,
          estado: s.estado,
          informe: s.documentos_seguimiento?.no_documento ?? s.documentos_seguimiento?.no_nombramiento ?? null,
          fecha: s.documentos_seguimiento?.fecha_documento ?? null,
          acciones: s.acciones_responsables,
          comentario: s.comentario_auditoria,
        })),
    };
  });
  salida.sort((a, b) => a.cai.localeCompare(b.cai) || a.deficiencia.localeCompare(b.deficiencia));
  return salida;
}

function descripcionFiltros(filtros: FiltrosReporte, nombresDepartamento: string) {
  return [
    `Vista: ${ETAPAS_TITULO[filtros.etapa || "accion"] ?? filtros.etapa}`,
    filtros.estado ? `Estado: ${ESTADO_RECOMENDACION_LABELS[filtros.estado as EstadoRecomendacionEnum] ?? filtros.estado}` : null,
    filtros.dependencia ? `Dependencia: ${filtros.dependencia}` : null,
    nombresDepartamento ? `Departamento: ${nombresDepartamento}` : null,
    filtros.anio ? `Año del CAI: ${filtros.anio}` : null,
    filtros.q ? `Búsqueda: ${filtros.q}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function textoSeguimiento(s: FilaReporte["seguimientos"][number]) {
  const partes = [
    `Seguimiento ${s.numero}${s.informe ? ` · Informe ${s.informe}` : ""}${s.fecha ? ` (${s.fecha})` : ""}: ${ESTADO_RECOMENDACION_LABELS[s.estado]}`,
    s.acciones ? `Acciones de los responsables: ${s.acciones}` : null,
    s.comentario ? `Comentario de auditoría: ${s.comentario}` : null,
  ];
  return partes.filter(Boolean).join("\n");
}

const ahora = () => new Date().toLocaleDateString("es-GT", { timeZone: "America/Guatemala" });

export async function generarReporteXlsx(filas: FilaReporte[], filtros: FiltrosReporte, meta: { usuario: string; departamento: string }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SCIDAI";
  const ws = wb.addWorksheet("Estado de las recomendaciones", { views: [{ state: "frozen", ySplit: 6, xSplit: 2 }] });
  ws.columns = [
    { width: 6 }, { width: 16 }, { width: 26 }, { width: 30 }, { width: 20 }, { width: 50 }, { width: 70 }, { width: 14 }, { width: 14 },
  ];
  const titulo = (fila: number, texto: string, tam: number, negrita = true) => {
    ws.mergeCells(fila, 1, fila, 9);
    const c = ws.getCell(fila, 1);
    c.value = texto;
    c.font = { bold: negrita, size: tam, color: { argb: negrita ? "FF1F3864" : "FF595959" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  };
  titulo(1, "MINISTERIO DE FINANZAS PÚBLICAS", 13);
  titulo(2, "DIRECCIÓN DE AUDITORÍA INTERNA", 12);
  titulo(3, "REPORTE SEGUIMIENTO AL ESTADO DE LAS RECOMENDACIONES", 12);
  titulo(4, descripcionFiltros(filtros, meta.departamento), 10, false);
  titulo(5, `Generado el ${ahora()} · ${meta.usuario} · SCIDAI`, 9, false);
  const encabezado = ["No.", "CAI", "Departamento", "Dependencia auditada", "Tipo de auditoría", "Descripción de la deficiencia", "Recomendaciones y seguimientos", "Fecha de implementación", "Estado"];
  const h = ws.getRow(6);
  encabezado.forEach((t, i) => {
    const c = h.getCell(i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  h.height = 30;
  filas.forEach((f, i) => {
    const texto = [`Recomendación inicial:\n${f.recomendacion}`, ...f.seguimientos.map(textoSeguimiento)].join("\n\n");
    const r = ws.addRow([i + 1, f.cai, f.departamento, f.dependencia, f.tipoAuditoria, f.deficiencia, texto, f.fechaImplementacion ?? "", ESTADO_RECOMENDACION_LABELS[f.estado]]);
    r.alignment = { vertical: "top", wrapText: true };
    r.getCell(1).alignment = { vertical: "top", horizontal: "center" };
    r.eachCell((c) => (c.border = { bottom: { style: "thin", color: { argb: "FFBFBFBF" } } }));
  });
  ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: 9 } };
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 1 as unknown as ExcelJS.PaperSize };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function generarReporteDocx(filas: FilaReporte[], filtros: FiltrosReporte, meta: { usuario: string; departamento: string }) {
  const borde = { style: "single" as const, size: 4, color: "999999" };
  const bordes = { top: borde, bottom: borde, left: borde, right: borde };
  const run = (t: string, o: { bold?: boolean; size?: number } = {}) => new TextRun({ text: t, font: "Arial", size: o.size ?? 16, bold: o.bold });
  const parrafos = (t: string, o: { bold?: boolean } = {}) =>
    t.split("\n").map((l) => new Paragraph({ spacing: { after: 40 }, children: [run(l, o)] }));
  const ANCHOS = [500, 1100, 1500, 4300, 5100, 1000];
  const celda = (hijos: Paragraph[], w: number, gris = false) =>
    new TableCell({
      borders: bordes, width: { size: w, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 80, right: 80 },
      shading: gris ? { fill: "D9D9D9" } : undefined, children: hijos.length ? hijos : [new Paragraph({ children: [] })],
    });
  const cab = ["No.", "CAI", "Tipo de auditoría", "Descripción de la deficiencia", "Recomendaciones", "Estado"];
  const filasTabla = [
    new TableRow({ tableHeader: true, children: cab.map((t, i) => celda([new Paragraph({ alignment: AlignmentType.CENTER, children: [run(t, { bold: true })] })], ANCHOS[i], true)) }),
    ...filas.map(
      (f, i) =>
        new TableRow({
          children: [
            celda([new Paragraph({ alignment: AlignmentType.CENTER, children: [run(String(i + 1))] })], ANCHOS[0]),
            celda(parrafos(f.cai, { bold: true }), ANCHOS[1]),
            celda(parrafos(f.tipoAuditoria), ANCHOS[2]),
            celda([...parrafos(f.dependencia, { bold: true }), ...parrafos(f.deficiencia)], ANCHOS[3]),
            celda(
              [
                ...parrafos("Recomendación Inicial:", { bold: true }),
                ...parrafos(f.recomendacion),
                ...f.seguimientos.flatMap((s) => [new Paragraph({ spacing: { before: 80, after: 40 }, children: [] }), ...parrafos(textoSeguimiento(s))]),
              ],
              ANCHOS[4],
            ),
            celda(parrafos(ESTADO_RECOMENDACION_LABELS[f.estado]), ANCHOS[5]),
          ],
        }),
    ),
  ];
  const centrado = (t: string, o: { bold?: boolean; size?: number } = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run(t, o)] });
  const doc = new Document({
    title: "Reporte seguimiento al estado de las recomendaciones",
    creator: "SCIDAI",
    sections: [
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE, width: 12240, height: 15840 }, margin: { top: 900, bottom: 900, left: 850, right: 850 } } },
        headers: { default: new Header({ children: [] }) },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], font: "Arial", size: 14 }),
                  run(` - Generado ${ahora()} - ${meta.usuario} - SCIDAI`, { size: 14 }),
                ],
              }),
            ],
          }),
        },
        children: [
          centrado("MINISTERIO DE FINANZAS PÚBLICAS", { bold: true, size: 22 }),
          centrado("DIRECCIÓN DE AUDITORÍA INTERNA", { bold: true, size: 20 }),
          centrado("REPORTE SEGUIMIENTO AL ESTADO DE LAS RECOMENDACIONES", { bold: true, size: 20 }),
          centrado(descripcionFiltros(filtros, meta.departamento), { size: 16 }),
          new Paragraph({ children: [] }),
          new Table({ width: { size: ANCHOS.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: ANCHOS, rows: filasTabla }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
