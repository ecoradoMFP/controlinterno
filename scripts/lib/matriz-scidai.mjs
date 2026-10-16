export const TIPOS_AUDITORIA = ["Cumplimiento y Financiera", "Cumplimiento", "Financiera", "Operativa", "Administrativa", "Especial"];
export const ESTADOS = ["Cumplida", "No cumplida", "En proceso", "Pendiente"];
export const TIPOS_DOCUMENTO = ["Nombramiento e informe", "Oficio"];
export const DEPARTAMENTOS = [
  "Departamento de Auditorías Financieras",
  "Departamento de Auditorías Administrativas y de Procesos",
  "Departamento de Auditorías Especiales",
];
export const NUM_SEGUIMIENTOS = 3;

export const BLOQUES = [
  {
    id: "id", titulo: "IDENTIFICACIÓN — en cada fila", color: "FF1F3864", columnas: [
      { k: "anio_cai", h: "Año del CAI", req: "obl", nivel: "fila", tipo: "entero", ancho: 9, ayuda: "El número de CAI se reinicia cada año. Ej.: 2026" },
      { k: "cai", h: "No. de CAI", req: "obl", nivel: "fila", tipo: "texto", ancho: 10, ayuda: "Ej.: 00001" },
      { k: "no_deficiencia", h: "No. de deficiencia", req: "obl", nivel: "fila", tipo: "entero", ancho: 11, ayuda: "1, 2, 3… dentro del CAI" },
    ],
  },
  {
    id: "cai", titulo: "ETAPA 1 · EL CAI (la auditoría) — se escribe UNA vez, en la primera fila de cada CAI", color: "FF2E75B6", columnas: [
      { k: "departamento", h: "Departamento que audita", req: "obl", nivel: "cai", tipo: "lista:Departamentos", ancho: 28, ayuda: "Elige de la lista" },
      { k: "dependencia", h: "Dependencia auditada", req: "obl", nivel: "cai", tipo: "lista:Dependencias", ancho: 30, ayuda: "Elige o escribe el nombre oficial" },
      { k: "tipo_auditoria", h: "Tipo de auditoría", req: "obl", nivel: "cai", tipo: "lista:Tipos", ancho: 22, ayuda: "Elige de la lista" },
      { k: "no_nombramiento", h: "No. de nombramiento", req: "obl", nivel: "cai", tipo: "texto", ancho: 17, ayuda: "Ej.: NAI-001-2026" },
      { k: "fecha_nombramiento", h: "Fecha de nombramiento", req: "obl", nivel: "cai", tipo: "fecha", ancho: 13, ayuda: "dd/mm/aaaa" },
      { k: "periodo_inicio", h: "Período auditado: inicio", req: "rec", nivel: "cai", tipo: "fecha", ancho: 13, ayuda: "dd/mm/aaaa" },
      { k: "periodo_fin", h: "Período auditado: fin", req: "rec", nivel: "cai", tipo: "fecha", ancho: 13, ayuda: "dd/mm/aaaa" },
      { k: "fecha_informe_final", h: "Fecha del informe final", req: "rec", nivel: "cai", tipo: "fecha", ancho: 13, ayuda: "dd/mm/aaaa" },
      { k: "fecha_notificacion", h: "Fecha de notificación del informe", req: "rec", nivel: "cai", tipo: "fecha", ancho: 14, ayuda: "dd/mm/aaaa" },
      { k: "supervisor", h: "Supervisor", req: "rec", nivel: "cai", tipo: "texto", ancho: 28, ayuda: "Nombre completo" },
      { k: "coordinador", h: "Coordinador", req: "rec", nivel: "cai", tipo: "texto", ancho: 28, ayuda: "Nombre completo" },
      { k: "auditores", h: "Auditor(es) del equipo", req: "rec", nivel: "cai", tipo: "texto", ancho: 32, ayuda: "Nombres completos, uno por línea" },
      { k: "riesgo", h: "Riesgo", req: "rec", nivel: "cai", tipo: "texto", ancho: 36, ayuda: "Texto completo" },
    ],
  },
  {
    id: "def", titulo: "ETAPA 2 · DEFICIENCIA Y RECOMENDACIÓN — una fila por deficiencia (UNA recomendación cada una)", color: "FF548235", columnas: [
      { k: "titulo", h: "Deficiencia (título)", req: "obl", nivel: "fila", tipo: "texto", ancho: 36, ayuda: "Nombre corto" },
      { k: "descripcion", h: "Descripción de la deficiencia", req: "rec", nivel: "fila", tipo: "texto", ancho: 44, ayuda: "Condición / síntesis" },
      { k: "recomendacion", h: "Recomendación", req: "obl", nivel: "fila", tipo: "texto", ancho: 56, ayuda: "Texto completo" },
      { k: "responsables", h: "Responsables de implementarla", req: "rec", nivel: "fila", tipo: "texto", ancho: 32, ayuda: "Nombre y puesto" },
      { k: "fecha_implementacion", h: "Fecha de implementación", req: "obl", nivel: "fila", tipo: "fecha", ancho: 13, ayuda: "dd/mm/aaaa" },
    ],
  },
  ...Array.from({ length: NUM_SEGUIMIENTOS }, (_, i) => {
    const n = i + 1;
    return {
      id: `s${n}`, seg: n, titulo: `SEGUIMIENTO ${n} — si el CAI aún no lo tiene, déjalo en blanco (las celdas azules se escriben una vez por CAI)`,
      color: ["FFC55A11", "FF7030A0", "FF806000"][i], columnas: [
        { k: `tipo_documento_${n}`, h: "Tipo de documento", req: "obl", nivel: "doc", tipo: "lista:TiposDocumento", ancho: 20, ayuda: "Elige de la lista" },
        { k: `no_nombramiento_${n}`, h: "No. de nombramiento", req: "obl", cond: true, nivel: "doc", tipo: "texto", ancho: 20, ayuda: "El del nombramiento de seguimiento" },
        { k: `fecha_nombramiento_${n}`, h: "Fecha del nombramiento", req: "obl", cond: true, nivel: "doc", tipo: "fecha", ancho: 13, ayuda: "dd/mm/aaaa" },
        { k: `coordinador_${n}`, h: "Coordina", req: "rec", cond: true, nivel: "doc", tipo: "texto", ancho: 26, ayuda: "Nombre completo" },
        { k: `fecha_limite_${n}`, h: "Fecha límite para notificar el informe", req: "obl", cond: true, nivel: "doc", tipo: "fecha", ancho: 14, ayuda: "dd/mm/aaaa" },
        { k: `auditores_${n}`, h: "Auditor(es) nombrado(s)", req: "obl", nivel: "doc", tipo: "texto", ancho: 28, ayuda: "Nombres completos, uno por línea" },
        { k: `no_documento_${n}`, h: "No. de informe u oficio", req: "obl", nivel: "doc", tipo: "texto", ancho: 20, ayuda: "El informe u oficio emitido" },
        { k: `fecha_documento_${n}`, h: "Fecha del informe u oficio", req: "obl", nivel: "doc", tipo: "fecha", ancho: 13, ayuda: "dd/mm/aaaa" },
        { k: `fecha_sag_${n}`, h: "Fecha de carga al SAG-UDAI", req: "rec", nivel: "doc", tipo: "fecha", ancho: 13, ayuda: "dd/mm/aaaa" },
        { k: `estado_${n}`, h: "Estado de la recomendación", req: "obl", nivel: "rec", tipo: "lista:Estados", ancho: 15, ayuda: "Elige de la lista" },
        { k: `acciones_${n}`, h: "Acciones de los responsables", req: "rec", nivel: "rec", tipo: "texto", ancho: 44, ayuda: "Qué hizo la dependencia" },
        { k: `comentario_${n}`, h: "Comentario de auditoría", req: "obl", nivel: "rec", tipo: "texto", ancho: 44, ayuda: "Conclusión de auditoría" },
      ],
    };
  }),
  {
    id: "notas", titulo: "NOTAS", color: "FF7F7F7F", columnas: [
      { k: "observaciones", h: "Notas (no se importa)", req: "no", nivel: "fila", tipo: "texto", ancho: 44, ayuda: "Dudas o aclaraciones" },
    ],
  },
];

export const COLUMNAS = BLOQUES.flatMap((b) => b.columnas.map((c) => ({ ...c, bloque: b })));
export const FILA_BANDA = 1;
export const FILA_ENCABEZADO = 2;
export const FILA_AYUDA = 3;
export const PRIMERA_FILA_DATOS = 4;
export const FILAS_FORMATEADAS = 300;
export const NOMBRE_HOJA = "Matriz";
