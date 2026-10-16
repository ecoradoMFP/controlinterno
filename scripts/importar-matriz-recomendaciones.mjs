// Uso (solo local): node scripts/importar-matriz-recomendaciones.mjs "<ruta.xlsx>" --departamento "<nombre>" [--oficios DOC1,DOC2] [--registrado-por <nit>] [--simular]

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function cargarEnv(archivo) {
  const contenido = readFileSync(path.join(ROOT, archivo), "utf8");
  const env = {};
  for (const linea of contenido.split("\n")) {
    const m = linea.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const args = process.argv.slice(2);
function opcion(nombre) {
  const i = args.indexOf(nombre);
  if (i === -1) return undefined;
  const valor = args[i + 1];
  args.splice(i, 2);
  return valor;
}
const simular = args.includes("--simular");
if (simular) args.splice(args.indexOf("--simular"), 1);
const nombreDepartamento = opcion("--departamento");
const registradoPorArg = opcion("--registrado-por");
const oficios = new Set((opcion("--oficios") ?? "").split(",").map((d) => d.trim()).filter(Boolean));
const rutaArchivo = args[0];
if (!rutaArchivo || !nombreDepartamento) {
  console.error(
    'Uso: node scripts/importar-matriz-recomendaciones.mjs "<ruta.xlsx>" --departamento "<nombre>" [--oficios DOC1,DOC2] [--registrado-por <nit>] [--simular]',
  );
  process.exit(1);
}

const normalizar = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const claveTexto = (v) => normalizar(v).replace(/[^a-z0-9]/g, "");

function textoCelda(valor) {
  if (valor == null) return "";
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "object") {
    if ("richText" in valor) return valor.richText.map((t) => t.text).join("").trim();
    if ("result" in valor) return textoCelda(valor.result);
    if ("text" in valor) return String(valor.text).trim();
  }
  return String(valor).trim();
}

function fechaDeTexto(t) {
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
  const anio = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${anio}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function fechaCelda(valor) {
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return fechaDeTexto(textoCelda(valor));
}

function periodoDeTexto(t) {
  const partes = t.split(/\s+al\s+/i).map((p) => fechaDeTexto(p.trim()));
  return partes.length === 2 && partes[0] && partes[1] ? { inicio: partes[0], fin: partes[1] } : null;
}

const limpiarCai = (t) => t.replace(/^cai\s*/i, "").trim();

const advertencias = [];
const advertir = (msg) => advertencias.push(msg);

const ENCABEZADOS = [
  ["no. de nombramiento", "nombramiento"],
  ["nombramiento no", "nombramiento"],
  ["no. cai", "cai"],
  ["no. de informe", "documento"],
  ["oficio o informe", "documento"],
  ["no cumplida", "no_cumplida"],
  ["cai", "cai"],
  ["periodo de la auditoria", "periodo"],
  ["periodo auditado", "periodo"],
  ["tipo de auditoria", "tipo_auditoria"],
  ["supervisor", "supervisor"],
  ["coordinador", "coordinador"],
  ["auditor", "auditores"],
  ["dependencia", "dependencia"],
  ["nombre de la dependencia", "dependencia"],
  ["riesgo", "riesgo"],
  ["fecha del informe final", "fecha_informe_final"],
  ["fecha de implementacion", "fecha_implementacion"],
  ["deficiencia", "deficiencia"],
  ["nombre de la deficiencia", "deficiencia"],
  ["estado de recomendaciones", "estado_texto"],
  ["recomendacion", "recomendacion"],
  ["cumplida", "cumplida"],
  ["en proceso", "en_proceso"],
  ["pendiente", "pendiente"],
];

function mapearEncabezados(fila) {
  const columnas = {};
  fila.eachCell((celda, col) => {
    const t = normalizar(textoCelda(celda.value));
    if (!t) return;
    if (t === "fecha" || t === "fecha de nombramiento") {
      columnas[columnas.documento ? "fecha_documento" : "fecha_nombramiento"] ??= col;
      return;
    }
    const encontrado = ENCABEZADOS.find(([frase]) => t.startsWith(frase));
    if (encontrado && !columnas[encontrado[1]]) columnas[encontrado[1]] = col;
  });
  return columnas;
}

const ESTADOS = ["cumplida", "no_cumplida", "en_proceso", "pendiente"];

function estadoDeFila(fila, columnas, etiqueta) {
  const marcados = ESTADOS.filter((e) => columnas[e] && textoCelda(fila.getCell(columnas[e]).value));
  if (marcados.length > 1) advertir(`${etiqueta}: más de un estado marcado (${marcados.join(", ")}); se toma "${marcados[0]}".`);
  if (marcados.length) return marcados[0];
  if (columnas.estado_texto) {
    const t = normalizar(textoCelda(fila.getCell(columnas.estado_texto).value)).replace(/ /g, "_");
    if (ESTADOS.includes(t)) return t;
  }
  return null;
}

function parseDeficiencia(texto) {
  const m = texto.match(/^\s*(\d+)\s*[.)-]\s*(.+)$/s);
  return m ? { numero: Number(m[1]), titulo: m[2].trim() } : { numero: null, titulo: texto.trim() };
}

const esContinuacionCombinada = (celda) => celda.isMerged && celda.master.address !== celda.address;

const libro = new ExcelJS.Workbook();
await libro.xlsx.readFile(rutaArchivo);
const hoja = libro.worksheets[0];

const bloques = [];
hoja.eachRow({ includeEmpty: false }, (fila, n) => {
  const columnas = mapearEncabezados(fila);
  if (columnas.deficiencia && columnas.recomendacion) {
    bloques.push({ etapa: bloques.length + 1, columnas, filas: [] });
    return;
  }
  const bloque = bloques.at(-1);
  if (!bloque) return;
  const cols = bloque.columnas;
  const celdaDeficiencia = fila.getCell(cols.deficiencia);
  const deficiencia = textoCelda(celdaDeficiencia.value);
  if (!deficiencia || esContinuacionCombinada(celdaDeficiencia)) return;

  const valor = (clave) => (cols[clave] ? fila.getCell(cols[clave]).value : null);
  bloque.filas.push({
    fila: n,
    nombramiento: textoCelda(valor("nombramiento")),
    cai: limpiarCai(textoCelda(valor("cai"))),
    periodo: periodoDeTexto(textoCelda(valor("periodo"))),
    tipo_auditoria: textoCelda(valor("tipo_auditoria")),
    fecha_nombramiento: fechaCelda(valor("fecha_nombramiento")),
    supervisor: textoCelda(valor("supervisor")),
    coordinador: textoCelda(valor("coordinador")),
    auditores: textoCelda(valor("auditores")),
    dependencia: textoCelda(valor("dependencia")),
    riesgo: textoCelda(valor("riesgo")),
    fecha_informe_final: fechaCelda(valor("fecha_informe_final")),
    deficiencia,
    recomendacion: textoCelda(valor("recomendacion")),
    fecha_implementacion: fechaCelda(valor("fecha_implementacion")),
    estado: estadoDeFila(fila, cols, `Bloque ${bloque.etapa}, fila ${n}`),
    documento: textoCelda(valor("documento")),
    fecha_documento: fechaCelda(valor("fecha_documento")),
  });
});

if (bloques.length === 0) {
  console.error("No se encontró ninguna fila de encabezados con columnas de deficiencias y recomendaciones.");
  process.exit(1);
}

const CAMPOS_INFORME = [
  "nombramiento", "cai", "periodo", "tipo_auditoria", "fecha_nombramiento", "supervisor", "coordinador",
  "auditores", "dependencia", "riesgo", "fecha_informe_final",
];

for (const bloque of bloques) {
  let previa = null;
  for (const f of bloque.filas) {
    if (previa && !f.nombramiento && !f.cai) {
      for (const k of CAMPOS_INFORME) f[k] ||= previa[k];
    }
    previa = f;
  }
}

const claveInforme = (f) => (f.nombramiento ? `n:${claveTexto(f.nombramiento)}` : f.cai ? `c:${claveTexto(f.cai)}` : null);

const informes = new Map();

function documentoDe(informe, f) {
  const clave = claveTexto(f.documento);
  let doc = informe.documentos.get(clave);
  if (!doc) {
    doc = { no_documento: f.documento, fecha: f.fecha_documento, orden: informe.documentos.size };
    informe.documentos.set(clave, doc);
  } else if (!doc.fecha && f.fecha_documento) {
    doc.fecha = f.fecha_documento;
  }
  return doc;
}

for (const f of bloques[0].filas) {
  const etiqueta = `Fila ${f.fila}`;
  const clave = claveInforme(f);
  if (!clave) {
    advertir(`${etiqueta}: sin No. de nombramiento ni CAI, se omite.`);
    continue;
  }
  let informe = informes.get(clave);
  if (!informe) {
    informe = { ...f, deficiencias: new Map(), documentos: new Map() };
    informes.set(clave, informe);
  }

  const { numero, titulo } = parseDeficiencia(f.deficiencia);
  const numDef = numero ?? informe.deficiencias.size + 1;
  let deficiencia = informe.deficiencias.get(numDef);
  if (!deficiencia) {
    deficiencia = { numero: numDef, titulo, recomendaciones: [] };
    informe.deficiencias.set(numDef, deficiencia);
  }

  if (!f.recomendacion) {
    advertir(`${etiqueta}: deficiencia ${numDef} sin texto de recomendación, se omite la fila.`);
    continue;
  }
  const rec = {
    numero: deficiencia.recomendaciones.length + 1,
    texto: f.recomendacion,
    fecha_implementacion: f.fecha_implementacion,
    estado_inicial: null,
    evaluaciones: [],
  };
  deficiencia.recomendaciones.push(rec);

  if (!f.estado) {
    if (f.documento) advertir(`${etiqueta}: trae documento ${f.documento} pero ningún estado marcado; se ignora el documento.`);
    continue;
  }
  if (f.documento) {
    rec.evaluaciones.push({ documento: documentoDe(informe, f), estado: f.estado, etiqueta });
  } else if (f.estado !== "pendiente") {
    rec.estado_inicial = f.estado;
  }
}

for (const bloque of bloques.slice(1)) {
  for (const f of bloque.filas) {
    const etiqueta = `Etapa ${bloque.etapa}, fila ${f.fila}`;
    const informe = informes.get(claveInforme(f));
    if (!informe) {
      advertir(`${etiqueta}: "${f.nombramiento || f.cai}" no aparece en la 1ra etapa, se omite.`);
      continue;
    }
    const { numero } = parseDeficiencia(f.deficiencia);
    const deficiencia = informe.deficiencias.get(numero);
    if (!deficiencia) {
      advertir(`${etiqueta}: la deficiencia "${f.deficiencia}" no existe en la 1ra etapa, se omite.`);
      continue;
    }
    const rec =
      deficiencia.recomendaciones.find((r) => normalizar(r.texto) === normalizar(f.recomendacion)) ??
      (deficiencia.recomendaciones.length === 1 ? deficiencia.recomendaciones[0] : null);
    if (!rec) {
      advertir(`${etiqueta}: no se pudo identificar a qué recomendación de la deficiencia ${numero} corresponde, se omite.`);
      continue;
    }
    if (normalizar(rec.texto) !== normalizar(f.recomendacion)) {
      advertir(`${etiqueta}: el texto de la recomendación no coincide exactamente con la 1ra etapa (se usa el de la 1ra etapa).`);
    }
    if (!f.estado || !f.documento) {
      advertir(`${etiqueta}: un seguimiento necesita estado y No. de informe u oficio, se omite.`);
      continue;
    }
    rec.evaluaciones.push({ documento: documentoDe(informe, f), estado: f.estado, etiqueta });
  }
}

for (const informe of informes.values()) {
  const docs = [...informe.documentos.values()].sort(
    (a, b) => (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999") || a.orden - b.orden,
  );
  docs.forEach((d, i) => {
    d.numero = i + 1;
    d.tipo = oficios.has(d.no_documento) ? "oficio" : "informe";
    if (!d.fecha) advertir(`${informe.nombramiento || `CAI ${informe.cai}`}: el documento ${d.no_documento} no trae fecha.`);
  });
}

function incumplimientos(informe) {
  const faltas = [];
  if (!informe.nombramiento) faltas.push("sin No. de nombramiento");
  if (!informe.cai) faltas.push("sin CAI");
  if (!informe.fecha_nombramiento) faltas.push("sin fecha de nombramiento");
  if (!informe.tipo_auditoria) faltas.push("sin tipo de auditoría");
  for (const d of informe.deficiencias.values()) {
    if (d.recomendaciones.length > 1) faltas.push(`la deficiencia ${d.numero} tiene ${d.recomendaciones.length} recomendaciones (solo se permite una)`);
    if (d.recomendaciones.some((r) => !r.fecha_implementacion)) faltas.push(`la deficiencia ${d.numero} tiene una recomendación sin fecha de implementación`);
  }
  return faltas;
}

for (const informe of informes.values()) {
  const faltas = incumplimientos(informe);
  if (faltas.length) advertir(`${informe.nombramiento || `CAI ${informe.cai}`}: NO se cargará — ${faltas.join("; ")}.`);
}

for (const informe of informes.values()) {
  const nombre = informe.nombramiento || `CAI ${informe.cai}`;
  const textos = new Map();
  for (const d of informe.deficiencias.values()) {
    for (const r of d.recomendaciones) {
      const t = normalizar(r.texto);
      if (textos.has(t)) {
        advertir(`${nombre}: la recomendación de la deficiencia ${d.numero} es idéntica a la de la deficiencia ${textos.get(t)} — ¿copiada por error?`);
      } else {
        textos.set(t, d.numero);
      }
      if (informe.fecha_informe_final && r.fecha_implementacion && r.fecha_implementacion < informe.fecha_informe_final) {
        advertir(`${nombre}, deficiencia ${d.numero}: fecha de implementación (${r.fecha_implementacion}) anterior al informe final (${informe.fecha_informe_final}).`);
      }
    }
  }
  for (const doc of informe.documentos.values()) {
    if (doc.fecha && informe.fecha_informe_final && doc.fecha < informe.fecha_informe_final) {
      advertir(`${nombre}: el documento de seguimiento ${doc.no_documento} (${doc.fecha}) es anterior al informe final (${informe.fecha_informe_final}).`);
    }
  }
}

console.log(`Archivo: ${rutaArchivo}`);
console.log(`Bloques detectados: ${bloques.length} (${bloques.map((b) => `${b.etapa}: ${b.filas.length} fila(s)`).join(", ")})`);
for (const informe of informes.values()) {
  const recs = [...informe.deficiencias.values()].flatMap((d) => d.recomendaciones);
  const docs = [...informe.documentos.values()].sort((a, b) => a.numero - b.numero);
  console.log(
    `  ${informe.nombramiento || `CAI ${informe.cai}`} · ${informe.dependencia} · ${informe.deficiencias.size} deficiencia(s), ${recs.length} recomendación(es)`,
  );
  for (const d of docs) {
    const n = recs.filter((r) => r.evaluaciones.some((e) => e.documento === d)).length;
    console.log(`      Documento ${d.numero}: ${d.tipo} ${d.no_documento} (${d.fecha ?? "sin fecha"}) — evalúa ${n} recomendación(es)`);
  }
  const iniciales = recs.filter((r) => r.estado_inicial).length;
  if (iniciales) console.log(`      Estado al informe final (sin documento): ${iniciales} recomendación(es)`);
}

if (simular) {
  if (advertencias.length) console.log(`\nAdvertencias (${advertencias.length}):\n  - ${advertencias.join("\n  - ")}`);
  console.log("\n--simular: no se escribió nada.");
  process.exit(0);
}

const env = cargarEnv(".env.development.local");
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.development.local");
}
if (!SUPABASE_URL.includes("127.0.0.1") && !SUPABASE_URL.includes("localhost")) {
  throw new Error(`Este script solo corre contra la instancia LOCAL de Supabase. URL detectada: ${SUPABASE_URL}`);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function ok(promesa, que) {
  const { data, error } = await promesa;
  if (error) throw new Error(`${que}: ${error.message}`);
  return data;
}

const departamentos = await ok(sb.from("departamentos").select("id, nombre"), "departamentos");
const departamento = departamentos.find((d) => normalizar(d.nombre) === normalizar(nombreDepartamento));
if (!departamento) {
  throw new Error(`No existe el departamento "${nombreDepartamento}". Opciones: ${departamentos.map((d) => d.nombre).join(" | ")}`);
}

const usuarios = await ok(sb.from("usuarios").select("nit, nombre, cargo"), "usuarios");
const usuarioPorNombre = new Map(usuarios.map((u) => [normalizar(u.nombre), u.nit]));

const registradoPor = registradoPorArg ?? usuarios.find((u) => u.cargo === "director")?.nit;
if (!registradoPor || !usuarios.some((u) => u.nit === registradoPor)) {
  throw new Error("No se encontró quién registra la carga: pasa --registrado-por <nit> de un usuario existente.");
}

function nitDe(nombre, rol, informe) {
  if (!nombre) return null;
  const nit = usuarioPorNombre.get(normalizar(nombre));
  if (!nit) advertir(`${informe}: ${rol} "${nombre}" no es usuario del sistema, queda sin asignar.`);
  return nit ?? null;
}

const existentes = await ok(
  sb.from("informes_auditoria").select("no_nombramiento, cai").eq("departamento_id", departamento.id),
  "informes existentes",
);
const yaCargados = new Set(existentes.map((i) => claveInforme({ nombramiento: i.no_nombramiento, cai: i.cai })));

const documentosPorNumero = new Map(
  (await ok(sb.from("documentos_seguimiento").select("id, no_documento"), "documentos existentes")).map((d) => [
    claveTexto(d.no_documento),
    d.id,
  ]),
);

const COMENTARIO_CARGA = "Cargado desde la matriz de seguimiento del departamento.";
let creados = 0;
for (const [clave, informe] of informes) {
  const nombre = informe.nombramiento || `CAI ${informe.cai}`;
  if (yaCargados.has(clave)) {
    advertir(`${nombre}: ya existe en ${departamento.nombre}, no se vuelve a cargar.`);
    continue;
  }
  if (incumplimientos(informe).length) continue;

  const informeId = randomUUID();
  await ok(
    sb.from("informes_auditoria").insert({
      id: informeId,
      no_nombramiento: informe.nombramiento || null,
      cai: informe.cai || null,
      departamento_id: departamento.id,
      dependencia_auditada: informe.dependencia,
      tipo_auditoria: informe.tipo_auditoria || null,
      periodo_auditado_inicio: informe.periodo?.inicio ?? null,
      periodo_auditado_fin: informe.periodo?.fin ?? null,
      fecha_nombramiento: informe.fecha_nombramiento,
      fecha_informe_final: informe.fecha_informe_final,
      supervisor_nit: nitDe(informe.supervisor, "supervisor(a)", nombre),
      coordinador_nit: nitDe(informe.coordinador, "coordinador(a)", nombre),
      riesgo: informe.riesgo || null,
      creado_por_nit: registradoPor,
    }),
    `informe ${nombre}`,
  );

  const auditores = informe.auditores
    .split(/\n|,|;| y /)
    .map((n) => nitDe(n.trim(), "auditor(a)", nombre))
    .filter(Boolean);
  if (auditores.length) {
    await ok(
      sb.from("informes_auditoria_equipo").insert([...new Set(auditores)].map((nit) => ({ informe_id: informeId, usuario_nit: nit }))),
      `equipo ${nombre}`,
    );
  }

  for (const doc of informe.documentos.values()) {
    const clave = claveTexto(doc.no_documento);
    const existente = documentosPorNumero.get(clave);
    if (existente) {
      doc.id = existente;
      continue;
    }
    doc.id = randomUUID();
    await ok(
      sb.from("documentos_seguimiento").insert({
        id: doc.id,
        departamento_id: departamento.id,
        tipo_documento: doc.tipo,
        no_documento: doc.no_documento,
        fecha_documento: doc.fecha,
        creado_por_nit: registradoPor,
      }),
      `documento ${doc.no_documento} de ${nombre}`,
    );
    documentosPorNumero.set(clave, doc.id);
  }

  if (informe.documentos.size) {
    await ok(
      sb
        .from("documentos_seguimiento_informes")
        .upsert([...informe.documentos.values()].map((doc) => ({ documento_id: doc.id, informe_id: informeId }))),
      `cobertura de los documentos de ${nombre}`,
    );
  }

  for (const d of informe.deficiencias.values()) {
    const deficienciaId = randomUUID();
    await ok(
      sb.from("deficiencias").insert({ id: deficienciaId, informe_id: informeId, numero: d.numero, titulo: d.titulo, creado_por_nit: registradoPor }),
      `deficiencia ${d.numero} de ${nombre}`,
    );
    for (const r of d.recomendaciones) {
      const recomendacionId = randomUUID();
      await ok(
        sb.from("recomendaciones").insert({
          id: recomendacionId,
          deficiencia_id: deficienciaId,
          numero: r.numero,
          texto: r.texto,
          fecha_implementacion: r.fecha_implementacion,
          creado_por_nit: registradoPor,
        }),
        `recomendación ${d.numero}.${r.numero} de ${nombre}`,
      );
      const filas = [
        ...(r.estado_inicial ? [{ documento_id: null, estado: r.estado_inicial }] : []),
        ...r.evaluaciones
          .sort((a, b) => a.documento.numero - b.documento.numero)
          .map((e) => ({ documento_id: e.documento.id, estado: e.estado })),
      ];
      for (const fila of filas) {
        await ok(
          sb.from("seguimientos_recomendacion").insert({
            recomendacion_id: recomendacionId,
            numero_seguimiento: 0,
            ...fila,
            comentario_auditoria: COMENTARIO_CARGA,
            registrado_por_nit: registradoPor,
          }),
          `estado de la recomendación ${d.numero}.${r.numero} de ${nombre}`,
        );
      }
    }
  }
  creados += 1;
}

console.log(`\nInformes cargados en ${departamento.nombre}: ${creados}.`);
if (advertencias.length) console.log(`\nAdvertencias (${advertencias.length}):\n  - ${advertencias.join("\n  - ")}`);
