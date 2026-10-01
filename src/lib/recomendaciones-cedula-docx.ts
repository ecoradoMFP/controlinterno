import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { etiquetaCai } from "@/lib/recomendaciones";
import type { cargarCedulaDocumento } from "@/lib/recomendaciones-datos";
import { ESTADO_RECOMENDACION_LABELS, type EstadoRecomendacionEnum } from "@/types/domain";

type Cedula = NonNullable<Awaited<ReturnType<typeof cargarCedulaDocumento>>>;

const FUENTE = "Arial";
const TAM = 16; // medias puntos: 8 pt, como la cédula en papel
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const COLUMNAS_ESTADO: EstadoRecomendacionEnum[] = ["cumplida", "no_cumplida", "en_proceso", "pendiente"];
// Ancho útil en twips (carta horizontal, márgenes de 1.5 cm): No., texto, 4 estados, responsable, seguimiento.
const ANCHOS = [500, 4200, 1000, 1000, 1000, 1000, 1900, 3540];

// "2024-05-20" -> "20 de mayo de 2024" (sin pasar por Date: evita corrimientos de zona horaria).
function fechaLarga(iso: string | null | undefined) {
  if (!iso) return null;
  const [anio, mes, dia] = iso.split("-").map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

function periodo(inicio: string | null, fin: string | null) {
  if (!inicio || !fin) return "";
  const [ai, mi, di] = inicio.split("-").map(Number);
  const [af] = fin.split("-").map(Number);
  const ini = `${String(di).padStart(2, "0")} de ${MESES[mi - 1]}${ai === af ? "" : ` de ${ai}`}`;
  return `del ${ini} al ${fechaLarga(fin)}`;
}

const borde = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };

const run = (text: string, opts: { bold?: boolean; size?: number } = {}) =>
  new TextRun({ text, font: FUENTE, size: opts.size ?? TAM, bold: opts.bold });

// Un párrafo por línea del texto: respeta los saltos que escribió el auditor.
function parrafos(texto: string | null | undefined, opts: { bold?: boolean } = {}) {
  if (!texto?.trim()) return [];
  return texto
    .trim()
    .split(/\r?\n/)
    .map((linea) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 80 }, children: [run(linea, opts)] }));
}

const titulo = (texto: string) => new Paragraph({ spacing: { before: 120, after: 80 }, children: [run(texto, { bold: true })] });

function celda(hijos: Paragraph[], ancho: number, extra: { shading?: string; columnas?: number; centrar?: boolean } = {}) {
  return new TableCell({
    borders: bordes,
    width: { size: ancho, type: WidthType.DXA },
    columnSpan: extra.columnas,
    shading: extra.shading ? { fill: extra.shading } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: hijos.length ? hijos : [new Paragraph({ children: [] })],
    verticalAlign: extra.centrar ? "center" : undefined,
  });
}

const centrado = (texto: string, bold = false) =>
  new Paragraph({ alignment: AlignmentType.CENTER, children: [run(texto, { bold })] });

export async function generarCedulaDocx({ documento, informes, filas }: Cedula): Promise<Buffer> {
  const logo = await readFile(path.join(process.cwd(), "public", "minfin-logo-azul.png"));
  const dependencia = [...new Set(informes.map((i) => i.dependencia_auditada))].join(" / ");
  const refDocumento = documento.no_documento ?? "(informe en elaboración)";
  const gris = "D9D9D9";

  const encabezadoTabla = [
    new TableRow({
      tableHeader: true,
      children: [
        celda([centrado("No.", true)], ANCHOS[0], { shading: gris, centrar: true }),
        celda([centrado("Deficiencias y Recomendaciones", true)], ANCHOS[1], { shading: gris, centrar: true }),
        celda([centrado("Estado de la Recomendación", true)], ANCHOS[2] + ANCHOS[3] + ANCHOS[4] + ANCHOS[5], {
          shading: gris,
          columnas: 4,
        }),
        celda([centrado("Responsable de la Implementar la Recomendación", true)], ANCHOS[6], { shading: gris, centrar: true }),
        celda([centrado("Seguimiento", true)], ANCHOS[7], { shading: gris, centrar: true }),
      ],
    }),
    new TableRow({
      tableHeader: true,
      children: [
        celda([], ANCHOS[0], { shading: gris }),
        celda([], ANCHOS[1], { shading: gris }),
        ...COLUMNAS_ESTADO.map((e, i) => celda([centrado(ESTADO_RECOMENDACION_LABELS[e], true)], ANCHOS[2 + i], { shading: gris })),
        celda([], ANCHOS[6], { shading: gris }),
        celda([], ANCHOS[7], { shading: gris }),
      ],
    }),
  ];

  const cuerpo: TableRow[] = [];
  let informeActual: string | null = null;
  let correlativo = 0;
  for (const f of filas) {
    if (f.informe.id !== informeActual) {
      informeActual = f.informe.id;
      const notificado = fechaLarga(f.informe.fecha_notificacion);
      cuerpo.push(
        new TableRow({
          children: [
            celda([], ANCHOS[0], { shading: gris }),
            celda(
              [
                new Paragraph({
                  children: [
                    run(
                      `Informe de Auditoría Interna, ${etiquetaCai(f.informe.cai) ?? `Nombramiento ${f.informe.no_nombramiento}`} ${f.informe.periodo_auditado_inicio ? `Período ${periodo(f.informe.periodo_auditado_inicio, f.informe.periodo_auditado_fin)}` : ""}${notificado ? `, notificado el ${notificado}` : ""}`,
                      { bold: true },
                    ),
                  ],
                }),
              ],
              ANCHOS.slice(1).reduce((a, b) => a + b, 0),
              { shading: gris, columnas: 7 },
            ),
          ],
        }),
      );
    }

    correlativo += 1;
    const { deficiencia, recomendacion, evaluacion, anteriores } = f;
    const izquierda = [
      titulo(deficiencia.titulo.toUpperCase()),
      ...parrafos(deficiencia.descripcion),
      titulo("RECOMENDACIÓN"),
      ...parrafos(recomendacion.texto),
      ...anteriores.flatMap((a) => [
        new Paragraph({
          spacing: { before: 80, after: 80 },
          children: [
            run(
              `Seguimiento al Informe de Actividad Administrativa No. ${a.documentos_seguimiento?.no_documento}. Recomendación ${ESTADO_RECOMENDACION_LABELS[a.estado].toLowerCase()}.`,
              { bold: true },
            ),
          ],
        }),
        ...parrafos(a.comentario_auditoria),
      ]),
    ];
    const derecha = [
      ...(evaluacion?.acciones_responsables ? [titulo("ACCIONES DE LOS RESPONSABLES"), ...parrafos(evaluacion.acciones_responsables)] : []),
      ...(evaluacion?.comentario_auditoria ? [titulo("COMENTARIO DE AUDITORÍA"), ...parrafos(evaluacion.comentario_auditoria)] : []),
    ];

    cuerpo.push(
      new TableRow({
        children: [
          celda([centrado(String(correlativo))], ANCHOS[0]),
          celda(izquierda, ANCHOS[1]),
          ...COLUMNAS_ESTADO.map((e, i) => celda([centrado(evaluacion?.estado === e ? "X" : "", true)], ANCHOS[2 + i])),
          celda(parrafos(recomendacion.responsables), ANCHOS[6]),
          celda(derecha, ANCHOS[7]),
        ],
      }),
    );
  }

  const encabezado = new Header({
    children: [
      new Paragraph({
        children: [new ImageRun({ type: "png", data: logo, transformation: { width: 150, height: 49 }, altText: { name: "Logo", title: "Logo", description: "Ministerio de Finanzas Públicas" } })],
      }),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(`Ref: INFORME DE ACTIVIDAD ADMINISTRATIVA No. ${refDocumento}`, { bold: true, size: 12 })] }),
    ],
  });

  const pie = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [run("8a. Avenida 20-59 Zona 1, Centro Cívico, Guatemala PBX: 2374-3000 EXT: 11300", { size: 14 })],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], font: FUENTE, size: 16 }),
        ],
      }),
    ],
  });

  const doc = new Document({
    title: `Cédula de seguimiento ${refDocumento}`,
    creator: "SCIDAI",
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE, width: 12240, height: 15840 },
            margin: { top: 1100, bottom: 900, left: 850, right: 850 },
          },
        },
        headers: { default: encabezado },
        footers: { default: pie },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [run("CÉDULA DE SEGUIMIENTO A RECOMENDACIONES", { bold: true, size: 20 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [run(dependencia.toUpperCase(), { bold: true, size: 20 })],
          }),
          new Table({
            width: { size: ANCHOS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
            columnWidths: ANCHOS,
            rows: [...encabezadoTabla, ...cuerpo],
          }),
        ],
      },
    ],
    styles: { default: { document: { run: { font: FUENTE, size: TAM } } } },
  });

  return Packer.toBuffer(doc);
}
