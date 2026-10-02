// Genera la matriz de carga de SCIDAI (Excel, UNA hoja por etapas) para que los departamentos
// entreguen CAI nuevos o históricos en un formato estándar y completo: listas desplegables, fechas
// validadas, columnas obligatorias marcadas y celdas obligatorias vacías resaltadas en rojo.
//
// Uso:
//   node scripts/generar-matriz-carga.mjs --salida "Matriz.xlsx"                 # plantilla en blanco
//   node scripts/generar-matriz-carga.mjs --salida "Matriz.xlsx" --datos d.json  # precargada con lo que ya se conoce
//
// d.json: { "cai": [...], "def": [...], "seg": [...] } (fechas "aaaa-mm-dd"; `seg` con no_seguimiento 1..3).
// Lo que falte queda en blanco y resaltado: nunca se inventa.

import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import {
  BLOQUES, COLUMNAS, DEPARTAMENTOS, ESTADOS, FILA_AYUDA, FILA_BANDA, FILA_ENCABEZADO, FILAS_FORMATEADAS, NOMBRE_HOJA,
  NUM_SEGUIMIENTOS, PRIMERA_FILA_DATOS, TIPOS_AUDITORIA, TIPOS_DOCUMENTO,
} from "./lib/matriz-scidai.mjs";

const args = process.argv.slice(2);
const val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const salida = val("--salida");
if (!salida) throw new Error('Uso: node scripts/generar-matriz-carga.mjs --salida "Matriz.xlsx" [--datos datos.json]');
const datos = val("--datos") ? JSON.parse(readFileSync(val("--datos"), "utf8")) : { cai: [], def: [], seg: [] };

const DEPENDENCIAS = [
  "Despacho Ministerial", "Dirección Financiera", "Dirección de Transparencia Fiscal", "Dirección de Planificación y Desarrollo Institucional",
  "Dirección Técnica del Presupuesto", "Dirección de Análisis y Política Fiscal", "Dirección de Recursos Humanos", "Dirección de Asesoría Jurídica",
  "Registro General de Adquisiciones del Estado", "Dirección de Contabilidad del Estado", "Dirección de Bienes del Estado",
  "Dirección de Catastro y Avalúo de Bienes Inmuebles", "Dirección de Asuntos Administrativos", "Comunicación Social",
  "Taller Nacional de Grabados en Acero", "Tesorería Nacional",
];
const AZUL = "FF1F3864";
const ROJO_CLARO = "FFFFC7CE";
const L = (n) => {
  let s = "";
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

const wb = new ExcelJS.Workbook();
wb.creator = "SCIDAI";

// ── Instrucciones ──
const ins = wb.addWorksheet("Instrucciones", { properties: { tabColor: { argb: "FF2E75B6" } } });
ins.columns = [{ width: 125 }];
const lineas = [
  ["MATRIZ DE CARGA DE CAI — SCIDAI", "titulo"],
  ["", ""],
  ["Para qué sirve", "sub"],
  ["Es el formato único para entregar a SCIDAI los CAI de cualquier departamento, ya sean históricos o nuevos. Si un dato obligatorio falta, SCIDAI NO carga ese CAI y dice exactamente qué falta (hoja, fila y columna), así nada queda a medias.", ""],
  ["", ""],
  ["Cómo está organizada (una sola hoja, de izquierda a derecha, por etapas)", "sub"],
  ["IDENTIFICACIÓN: año del CAI, número de CAI y número de deficiencia. Se escribe en CADA fila.", ""],
  ["ETAPA 1 · EL CAI: departamento, dependencia, tipo de auditoría, nombramiento, fechas y equipo. Se escribe UNA sola vez, en la primera fila de cada CAI (como una celda combinada: las demás filas del CAI quedan vacías en estas columnas).", ""],
  ["ETAPA 2 · DEFICIENCIA Y RECOMENDACIÓN: una fila por deficiencia, con SU recomendación. Cada deficiencia lleva UNA sola recomendación y esta nace en estado Pendiente.", ""],
  [`SEGUIMIENTO 1, 2 y 3: cada seguimiento (nombramiento + informe, u oficio) ocupa su bloque. Los datos del documento (nombramiento, coordina, fecha límite, auditores, informe) se escriben UNA vez por CAI, en su primera fila; el estado, las acciones y el comentario, en la fila de cada recomendación. Si el CAI no tiene seguimientos, estos bloques se dejan en blanco. Para más de ${NUM_SEGUIMIENTOS} seguimientos, avisa a la DAI.`, ""],
  ["", ""],
  ["Reglas", "sub"],
  ["• Las filas de un mismo CAI van JUNTAS, una debajo de otra.", ""],
  ["• El número de CAI se REINICIA cada año: el CAI se identifica por número + año (el CAI 00001 de 2025 y el de 2026 son distintos).", ""],
  ["• Todo CAI lleva número de CAI y número de nombramiento. Las fechas van como dd/mm/aaaa.", ""],
  ["• El número del nombramiento y el del informe se escriben por separado, aunque a veces sean el mismo.", ""],
  ["• Todo nombramiento de seguimiento lleva quién coordina y la fecha límite para notificar el informe.", ""],
  ["• Toda recomendación lleva fecha de implementación.", ""],
  ["• Un seguimiento marcado 'Cumplida' cierra la recomendación: ya no se llenan seguimientos posteriores para esa fila.", ""],
  ["• Los nombres se escriben completos, como en el directorio de la DAI. Quien ya no forma parte de la DAI se registra igual; SCIDAI lo crea como exfuncionario.", ""],
  ["• No inventes datos: si no lo sabes, déjalo en blanco; la celda queda en rojo y se completa después.", ""],
  ["", ""],
  ["Colores", "sub"],
  ["Cada etapa tiene su color en la franja superior. Encabezado con * = obligatorio (sin esto el CAI no se carga); sin * = recomendado (se carga y queda pendiente de completar). Una celda obligatoria vacía, en una fila con datos, se pinta de ROJO.", ""],
];
for (const [texto, estilo] of lineas) {
  const f = ins.addRow([texto]);
  f.getCell(1).alignment = { wrapText: true, vertical: "top" };
  if (estilo === "titulo") f.getCell(1).font = { bold: true, size: 16, color: { argb: AZUL } };
  if (estilo === "sub") f.getCell(1).font = { bold: true, size: 12, color: { argb: AZUL } };
}

// ── Listas ──
const listas = wb.addWorksheet("Listas", { properties: { tabColor: { argb: "FF7F7F7F" } } });
const rango = {};
[["Departamentos", DEPARTAMENTOS], ["Dependencias", DEPENDENCIAS], ["Tipos", TIPOS_AUDITORIA], ["TiposDocumento", TIPOS_DOCUMENTO], ["Estados", ESTADOS]].forEach(([nombre, valores], i) => {
  listas.getCell(1, i + 1).value = nombre;
  listas.getCell(1, i + 1).font = { bold: true };
  valores.forEach((v, r) => (listas.getCell(r + 2, i + 1).value = v));
  listas.getColumn(i + 1).width = 50;
  rango[nombre] = `Listas!$${L(i + 1)}$2:$${L(i + 1)}$${valores.length + 1}`;
});

// ── Hoja de captura ──
const ultima = PRIMERA_FILA_DATOS + FILAS_FORMATEADAS - 1;
const ws = wb.addWorksheet(NOMBRE_HOJA, { views: [{ state: "frozen", xSplit: 3, ySplit: FILA_AYUDA }] });
const colDe = new Map(); // k -> nº de columna
let n = 0;
for (const b of BLOQUES) {
  const inicio = n + 1;
  for (const c of b.columnas) {
    n += 1;
    colDe.set(c.k, n);
    const h = ws.getCell(FILA_ENCABEZADO, n);
    h.value = c.req === "obl" ? `${c.h} *` : c.h;
    h.font = { bold: true, color: { argb: "FFFFFFFF" } };
    h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.req === "rec" ? "FF5B6B7B" : c.req === "no" ? "FFA6A6A6" : b.color } };
    h.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
    const a = ws.getCell(FILA_AYUDA, n);
    a.value = c.ayuda;
    a.font = { italic: true, size: 9, color: { argb: "FF7F7F7F" } };
    a.alignment = { wrapText: true, vertical: "top" };
    ws.getColumn(n).width = c.ancho;
    if (c.tipo === "texto") ws.getColumn(n).numFmt = "@";
    if (b.seg && b.seg > 1) ws.getColumn(n).outlineLevel = 1; // los seguimientos 2 y 3 se pueden contraer
  }
  const banda = ws.getCell(FILA_BANDA, inicio);
  banda.value = b.titulo;
  if (n > inicio) ws.mergeCells(FILA_BANDA, inicio, FILA_BANDA, n);
  banda.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  banda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: b.color } };
  banda.alignment = { wrapText: true, vertical: "middle", horizontal: "left" };
}
ws.getRow(FILA_BANDA).height = 36;
ws.getRow(FILA_ENCABEZADO).height = 44;
ws.getRow(FILA_AYUDA).height = 42;
const ULT = L(n);

// Validaciones y formato por celda.
COLUMNAS.forEach((c) => {
  const i = colDe.get(c.k);
  for (let r = PRIMERA_FILA_DATOS; r <= ultima; r++) {
    const celda = ws.getCell(r, i);
    celda.alignment = { wrapText: true, vertical: "top" };
    if (c.tipo === "fecha") {
      celda.numFmt = "dd/mm/yyyy";
      celda.dataValidation = { type: "date", operator: "greaterThan", formulae: [new Date(2000, 0, 1)], allowBlank: true, showErrorMessage: true, errorTitle: "Fecha inválida", error: "Escribe una fecha válida como dd/mm/aaaa." };
    } else if (c.tipo === "entero") {
      celda.dataValidation = { type: "whole", operator: "between", formulae: [1, 3000], allowBlank: true, showErrorMessage: true, errorTitle: "Número inválido", error: "Escribe un número entero." };
    } else if (c.tipo.startsWith("lista:")) {
      const nombre = c.tipo.slice(6);
      celda.dataValidation = {
        type: "list", allowBlank: true, formulae: [rango[nombre]], showErrorMessage: true,
        errorStyle: nombre === "Dependencias" ? "warning" : "stop", errorTitle: "Valor de la lista", error: "Elige un valor de la lista.",
      };
    }
  }
});

// Resaltado en rojo de obligatorios vacíos, según quién los escribe.
const P = PRIMERA_FILA_DATOS;
const filaConDatos = `COUNTA($A${P}:$${ULT}${P})>0`;
const primeraDelCai = `OR(ROW()=${P},$A${P}&"|"&$B${P}<>$A${P - 1}&"|"&$B${P - 1})`;
for (const b of BLOQUES) {
  const cols = b.columnas.map((c) => colDe.get(c.k));
  const bloqueEnFila = b.seg ? `COUNTA($${L(Math.min(...cols))}${P}:$${L(Math.max(...cols))}${P})>0` : null;
  const tipoCol = b.seg ? `$${L(colDe.get(`tipo_documento_${b.seg}`))}${P}` : null;
  for (const c of b.columnas) {
    if (c.req !== "obl") continue;
    const x = `${L(colDe.get(c.k))}${P}`;
    let f;
    if (c.nivel === "fila") f = `AND(${filaConDatos},LEN(${x})=0)`;
    else if (c.nivel === "cai") f = `AND(${filaConDatos},${primeraDelCai},LEN(${x})=0)`;
    else if (c.nivel === "doc") f = `AND(${primeraDelCai},${bloqueEnFila},${c.cond ? `${tipoCol}="Nombramiento e informe",` : ""}LEN(${x})=0)`;
    else f = `AND(${bloqueEnFila},LEN(${x})=0)`;
    const col = L(colDe.get(c.k));
    ws.addConditionalFormatting({
      ref: `${col}${P}:${col}${ultima}`,
      rules: [{ type: "expression", formulae: [f], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: ROJO_CLARO } } } }],
    });
  }
}

// ── Datos precargados ──
const fecha = (iso) => (iso ? new Date(`${iso}T12:00:00`) : null);
const claveNum = (k) => String(k ?? "").split("-")[0];
const claveAnio = (k) => String(k ?? "").split("-")[1] || null;
const coincide = (cai, k) => claveNum(k) === String(cai.cai) && (!claveAnio(k) || !cai.anio_cai || String(cai.anio_cai) === claveAnio(k));
let fila = P;
for (const cai of datos.cai ?? []) {
  const defs = (datos.def ?? []).filter((d) => coincide(cai, d.cai_clave)).sort((a, b) => a.no_deficiencia - b.no_deficiencia);
  const segs = (datos.seg ?? []).filter((s) => coincide(cai, s.cai_clave));
  defs.forEach((d, idx) => {
    const set = (k, v) => {
      if (v === undefined || v === null || v === "") return;
      const c = COLUMNAS.find((x) => x.k === k);
      ws.getCell(fila, colDe.get(k)).value = c.tipo === "fecha" ? fecha(v) : v;
    };
    set("anio_cai", cai.anio_cai);
    set("cai", cai.cai);
    set("no_deficiencia", d.no_deficiencia);
    if (idx === 0) {
      for (const c of COLUMNAS.filter((x) => x.nivel === "cai")) set(c.k, cai[c.k]);
    }
    for (const c of COLUMNAS.filter((x) => x.bloque.id === "def")) set(c.k, d[c.k]);
    for (let s = 1; s <= NUM_SEGUIMIENTOS; s++) {
      const delSeg = segs.filter((x) => x.no_seguimiento === s);
      if (idx === 0) {
        const doc = delSeg[0];
        if (doc) {
          set(`tipo_documento_${s}`, doc.tipo_documento); set(`no_nombramiento_${s}`, doc.no_nombramiento); set(`fecha_nombramiento_${s}`, doc.fecha_nombramiento);
          set(`coordinador_${s}`, doc.coordinador); set(`fecha_limite_${s}`, doc.fecha_limite); set(`auditores_${s}`, doc.auditores);
          set(`no_documento_${s}`, doc.no_documento); set(`fecha_documento_${s}`, doc.fecha_documento); set(`fecha_sag_${s}`, doc.fecha_sag);
        }
      }
      const propio = delSeg.find((x) => x.no_deficiencia === d.no_deficiencia);
      if (propio) {
        set(`estado_${s}`, propio.estado); set(`acciones_${s}`, propio.acciones); set(`comentario_${s}`, propio.comentario);
      }
    }
    const notas = [idx === 0 ? cai.observaciones : null, d.observaciones, ...segs.filter((x) => x.no_deficiencia === d.no_deficiencia).map((x) => x.observaciones)].filter(Boolean);
    set("observaciones", [...new Set(notas)].join(" · "));
    fila += 1;
  });
}

await wb.xlsx.writeFile(salida);
console.log(`Matriz generada: ${salida} (${(datos.cai ?? []).length} CAI, ${fila - P} filas precargadas)`);
