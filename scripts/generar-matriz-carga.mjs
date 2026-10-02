// Genera la matriz de carga de SCIDAI (Excel) para que los jefes capturen CAI completos: con listas
// desplegables, fechas validadas, columnas obligatorias marcadas y celdas vacías resaltadas en rojo.
//
// Uso:
//   node scripts/generar-matriz-carga.mjs --salida "Matriz.xlsx"                 # plantilla en blanco
//   node scripts/generar-matriz-carga.mjs --salida "Matriz.xlsx" --datos d.json  # precargada con lo que ya se conoce
//
// d.json: { "cai": [ {...} ], "def": [ {...} ], "seg": [ {...} ] } con las claves de scripts/lib/matriz-scidai.mjs
// (fechas como "aaaa-mm-dd"). Lo que falte queda en blanco y resaltado: nunca se inventa.

import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import {
  DEPARTAMENTOS, ESTADOS, FILA_AYUDA, FILA_ENCABEZADO, FILAS_FORMATEADAS, HOJAS, PRIMERA_FILA_DATOS, TIPOS_AUDITORIA, TIPOS_DOCUMENTO,
} from "./lib/matriz-scidai.mjs";

const args = process.argv.slice(2);
const val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const salida = val("--salida");
if (!salida) throw new Error('Uso: node scripts/generar-matriz-carga.mjs --salida "Matriz.xlsx" [--datos datos.json]');
const datos = val("--datos") ? JSON.parse(readFileSync(val("--datos"), "utf8")) : { cai: [], def: [], seg: [] };

// Dependencias oficiales (catálogo de unidades del Ministerio, tal cual está sembrado en la base).
const DEPENDENCIAS = [
  "Despacho Ministerial", "Dirección Financiera", "Dirección de Transparencia Fiscal", "Dirección de Planificación y Desarrollo Institucional",
  "Dirección Técnica del Presupuesto", "Dirección de Análisis y Política Fiscal", "Dirección de Recursos Humanos", "Dirección de Asesoría Jurídica",
  "Registro General de Adquisiciones del Estado", "Dirección de Contabilidad del Estado", "Dirección de Bienes del Estado",
  "Dirección de Catastro y Avalúo de Bienes Inmuebles", "Dirección de Asuntos Administrativos", "Comunicación Social",
  "Taller Nacional de Grabados en Acero", "Tesorería Nacional",
];

const AZUL = "FF1F3864";
const GRIS = "FF5B6B7B";
const ROJO_CLARO = "FFFFC7CE";
const letra = (n) => ExcelJS.utils?.colCache?.n2l?.(n) ?? String.fromCharCode(64 + n);

const wb = new ExcelJS.Workbook();
wb.creator = "SCIDAI";

// ── Instrucciones ──
const ins = wb.addWorksheet("Instrucciones", { properties: { tabColor: { argb: "FF2E75B6" } } });
ins.columns = [{ width: 120 }];
const lineas = [
  ["MATRIZ DE CARGA DE CAI — SCIDAI", "titulo"],
  ["", ""],
  ["Para qué sirve", "sub"],
  ["Aquí se captura, en un formato único para los tres departamentos, todo lo que SCIDAI necesita de cada CAI para darle seguimiento a sus recomendaciones. Si un dato obligatorio falta, SCIDAI NO carga ese CAI y dice exactamente qué falta, así no queda información a medias.", ""],
  ["", ""],
  ["Cómo se llena (3 hojas)", "sub"],
  ["1. CAI: una fila por CAI (año, número, dependencia, tipo de auditoría, nombramiento, fechas, equipo).", ""],
  ["2. Deficiencias: una fila por deficiencia, con SU recomendación. Cada deficiencia lleva UNA sola recomendación.", ""],
  ["3. Seguimientos: una fila por cada recomendación que ya fue evaluada en un seguimiento (informe u oficio). Si el CAI aún no tiene seguimientos, la hoja se deja vacía.", ""],
  ["", ""],
  ["Colores de los encabezados", "sub"],
  ["Azul oscuro con *  = obligatorio: sin este dato el CAI no se carga.", ""],
  ["Gris azulado  = recomendado: se carga sin él, pero queda como pendiente de completar.", ""],
  ["Gris claro  = notas: no se importa, es para dudas o aclaraciones.", ""],
  ["Una celda obligatoria vacía, en una fila que ya tiene datos, se pinta de ROJO.", ""],
  ["", ""],
  ["Reglas importantes", "sub"],
  ["• El número de CAI se REINICIA cada año: el CAI se identifica por número + año (el CAI 00001 de 2025 y el de 2026 son distintos).", ""],
  ["• Todo CAI lleva número de CAI y número de nombramiento. Las fechas van como dd/mm/aaaa.", ""],
  ["• Toda recomendación lleva fecha de implementación y nace en estado Pendiente; su estado cambia en los seguimientos.", ""],
  ["• En Deficiencias y Seguimientos, la columna CAI es una lista: primero se llena la hoja CAI y luego se elige de ahí.", ""],
  ["• En Seguimientos: si el documento es 'Nombramiento e informe', el número y la fecha del nombramiento son obligatorios; si es 'Oficio', no.", ""],
  ["• Los nombres de personas se escriben completos, como en el directorio de la DAI. Quien ya no forma parte de la DAI se registra como exfuncionario.", ""],
  ["• Un seguimiento marcado 'Cumplida' cierra la recomendación: no puede haber seguimientos posteriores.", ""],
  ["• No inventes datos: si no lo sabes, déjalo en blanco; la celda queda en rojo y se completa después.", ""],
];
for (const [texto, estilo] of lineas) {
  const f = ins.addRow([texto]);
  f.getCell(1).alignment = { wrapText: true, vertical: "top" };
  if (estilo === "titulo") f.getCell(1).font = { bold: true, size: 16, color: { argb: AZUL } };
  if (estilo === "sub") f.getCell(1).font = { bold: true, size: 12, color: { argb: AZUL } };
}

// ── Listas ──
const listas = wb.addWorksheet("Listas", { properties: { tabColor: { argb: "FF7F7F7F" } } });
const defListas = [
  ["Departamentos", DEPARTAMENTOS], ["Dependencias", DEPENDENCIAS], ["Tipos", TIPOS_AUDITORIA], ["TiposDocumento", TIPOS_DOCUMENTO], ["Estados", ESTADOS],
];
const rangoLista = {};
defListas.forEach(([nombre, valores], i) => {
  const col = i + 1;
  listas.getCell(1, col).value = nombre;
  listas.getCell(1, col).font = { bold: true };
  valores.forEach((v, r) => (listas.getCell(r + 2, col).value = v));
  listas.getColumn(col).width = 50;
  rangoLista[nombre] = `Listas!$${letra(col)}$2:$${letra(col)}$${valores.length + 1}`;
});

// ── Hojas de captura ──
const ultima = PRIMERA_FILA_DATOS + FILAS_FORMATEADAS - 1;
const hojas = {};
for (const [id, def] of Object.entries(HOJAS)) {
  const ws = wb.addWorksheet(def.nombre, { views: [{ state: "frozen", xSplit: id === "CAI" ? 2 : 1, ySplit: FILA_AYUDA }] });
  hojas[id] = ws;
  const cols = def.columnas;
  cols.forEach((c, i) => {
    const celda = ws.getCell(FILA_ENCABEZADO, i + 1);
    celda.value = c.req === "obl" || c.req === "cond" ? `${c.h} *` : c.h;
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.req === "no" ? "FFA6A6A6" : c.req === "rec" ? GRIS : AZUL } };
    celda.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
    const ayuda = ws.getCell(FILA_AYUDA, i + 1);
    ayuda.value = c.ayuda;
    ayuda.font = { italic: true, size: 9, color: { argb: "FF7F7F7F" } };
    ayuda.alignment = { wrapText: true, vertical: "top" };
    ws.getColumn(i + 1).width = c.ancho;
    if (c.tipo === "texto") ws.getColumn(i + 1).numFmt = "@";
  });
  ws.getRow(FILA_ENCABEZADO).height = 34;
  ws.getRow(FILA_AYUDA).height = 28;

  // Clave del CAI (automática) en la hoja CAI: alimenta las listas de las otras dos.
  if (id === "CAI") {
    const n = cols.length + 1;
    const h = ws.getCell(FILA_ENCABEZADO, n);
    h.value = "Clave del CAI (automática)";
    h.font = { bold: true, color: { argb: "FFFFFFFF" } };
    h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7F7F7F" } };
    h.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
    ws.getColumn(n).width = 16;
    for (let r = PRIMERA_FILA_DATOS; r <= ultima; r++) {
      ws.getCell(r, n).value = { formula: `IF(OR(B${r}="",A${r}=""),"",B${r}&"-"&A${r})` };
      ws.getCell(r, n).font = { color: { argb: "FF7F7F7F" } };
    }
    rangoLista.ClavesCAI = `CAI!$${letra(n)}$${PRIMERA_FILA_DATOS}:$${letra(n)}$${ultima}`;
  }
}

// Validaciones, formato y resaltado (después, porque ClavesCAI debe existir).
for (const [id, def] of Object.entries(HOJAS)) {
  const ws = hojas[id];
  const cols = def.columnas;
  const n = cols.length;
  cols.forEach((c, i) => {
    const L = letra(i + 1);
    for (let r = PRIMERA_FILA_DATOS; r <= ultima; r++) {
      const celda = ws.getCell(r, i + 1);
      celda.alignment = { wrapText: true, vertical: "top" };
      if (c.tipo === "fecha") celda.numFmt = "dd/mm/yyyy";
      if (c.tipo === "fecha") {
        celda.dataValidation = { type: "date", operator: "greaterThan", formulae: [new Date(2000, 0, 1)], allowBlank: true, showErrorMessage: true, errorTitle: "Fecha inválida", error: "Escribe una fecha válida como dd/mm/aaaa." };
      } else if (c.tipo === "entero") {
        celda.dataValidation = { type: "whole", operator: "between", formulae: [1, 3000], allowBlank: true, showErrorMessage: true, errorTitle: "Número inválido", error: "Escribe un número entero." };
      } else if (c.tipo.startsWith("lista:")) {
        const nombre = c.tipo.slice(6);
        celda.dataValidation = {
          type: "list", allowBlank: true, formulae: [rangoLista[nombre]], showErrorMessage: nombre !== "Dependencias",
          errorStyle: nombre === "Dependencias" ? "warning" : "stop", errorTitle: "Valor de la lista", error: "Elige un valor de la lista.",
        };
      }
    }
    // Obligatorio vacío en una fila con datos -> rojo.
    if (c.req === "obl" || c.req === "cond") {
      let formula = `AND(COUNTA($A${PRIMERA_FILA_DATOS}:$${letra(n)}${PRIMERA_FILA_DATOS})>0,LEN(${L}${PRIMERA_FILA_DATOS})=0)`;
      if (c.req === "cond") formula = `AND(COUNTA($A${PRIMERA_FILA_DATOS}:$${letra(n)}${PRIMERA_FILA_DATOS})>0,$D${PRIMERA_FILA_DATOS}="Nombramiento e informe",LEN(${L}${PRIMERA_FILA_DATOS})=0)`;
      ws.addConditionalFormatting({
        ref: `${L}${PRIMERA_FILA_DATOS}:${L}${ultima}`,
        rules: [{ type: "expression", formulae: [formula], style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: ROJO_CLARO } } } }],
      });
    }
  });
}

// ── Datos precargados ──
const fecha = (iso) => (iso ? new Date(`${iso}T12:00:00`) : null);
function volcar(id, filas) {
  const ws = hojas[id];
  const cols = HOJAS[id].columnas;
  filas.forEach((fila, idx) => {
    cols.forEach((c, i) => {
      let v = fila[c.k];
      if (v === undefined || v === null || v === "") return;
      if (c.tipo === "fecha") v = fecha(v);
      ws.getCell(PRIMERA_FILA_DATOS + idx, i + 1).value = v;
    });
  });
}
volcar("CAI", datos.cai ?? []);
volcar("DEF", datos.def ?? []);
volcar("SEG", datos.seg ?? []);

wb.views = [{ activeTab: 0 }];
await wb.xlsx.writeFile(salida);
console.log(`Matriz generada: ${salida} (${(datos.cai ?? []).length} CAI, ${(datos.def ?? []).length} deficiencias, ${(datos.seg ?? []).length} seguimientos precargados)`);
