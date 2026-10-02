// Definición ÚNICA de la matriz de carga de SCIDAI: la usan el generador (plantilla y matrices
// precargadas) y el importador, para que el formato nunca se desalinee.

export const TIPOS_AUDITORIA = ["Cumplimiento y Financiera", "Cumplimiento", "Financiera", "Operativa", "Administrativa", "Especial"];
export const ESTADOS = ["Cumplida", "No cumplida", "En proceso", "Pendiente"];
export const TIPOS_DOCUMENTO = ["Nombramiento e informe", "Oficio"];
export const DEPARTAMENTOS = [
  "Departamento de Auditorías Financieras",
  "Departamento de Auditorías Administrativas y de Procesos",
  "Departamento de Auditorías Especiales",
];

// req: "obl" (sin esto no se carga), "rec" (recomendado: se carga y se avisa), "no" (no se importa).
// tipo: texto | fecha | entero | lista:<nombre en Listas>
export const HOJAS = {
  CAI: {
    nombre: "CAI",
    columnas: [
      { k: "anio_cai", h: "Año del CAI", req: "obl", tipo: "entero", ancho: 10, ayuda: "El número de CAI se reinicia cada año. Ej.: 2026" },
      { k: "cai", h: "No. de CAI", req: "obl", tipo: "texto", ancho: 11, ayuda: "Ej.: 00001" },
      { k: "departamento", h: "Departamento que audita", req: "obl", tipo: "lista:Departamentos", ancho: 30, ayuda: "Elige de la lista" },
      { k: "dependencia", h: "Dependencia auditada", req: "obl", tipo: "lista:Dependencias", ancho: 34, ayuda: "Elige o escribe el nombre oficial" },
      { k: "tipo_auditoria", h: "Tipo de auditoría", req: "obl", tipo: "lista:Tipos", ancho: 24, ayuda: "Elige de la lista" },
      { k: "no_nombramiento", h: "No. de nombramiento", req: "obl", tipo: "texto", ancho: 18, ayuda: "Ej.: NAI-001-2026" },
      { k: "fecha_nombramiento", h: "Fecha de nombramiento", req: "obl", tipo: "fecha", ancho: 14, ayuda: "dd/mm/aaaa" },
      { k: "periodo_inicio", h: "Período auditado: inicio", req: "rec", tipo: "fecha", ancho: 14, ayuda: "dd/mm/aaaa" },
      { k: "periodo_fin", h: "Período auditado: fin", req: "rec", tipo: "fecha", ancho: 14, ayuda: "dd/mm/aaaa" },
      { k: "fecha_informe_final", h: "Fecha del informe final", req: "rec", tipo: "fecha", ancho: 14, ayuda: "dd/mm/aaaa" },
      { k: "fecha_notificacion", h: "Fecha de notificación del informe", req: "rec", tipo: "fecha", ancho: 16, ayuda: "dd/mm/aaaa" },
      { k: "supervisor", h: "Supervisor", req: "rec", tipo: "texto", ancho: 30, ayuda: "Nombre completo" },
      { k: "coordinador", h: "Coordinador", req: "rec", tipo: "texto", ancho: 30, ayuda: "Nombre completo" },
      { k: "auditores", h: "Auditor(es) del equipo", req: "rec", tipo: "texto", ancho: 36, ayuda: "Nombres completos, uno por línea" },
      { k: "riesgo", h: "Riesgo", req: "rec", tipo: "texto", ancho: 40, ayuda: "Texto completo" },
      { k: "observaciones", h: "Notas (no se importa)", req: "no", tipo: "texto", ancho: 40, ayuda: "Para dudas o aclaraciones" },
    ],
  },
  DEF: {
    nombre: "Deficiencias",
    columnas: [
      { k: "cai_clave", h: "CAI", req: "obl", tipo: "lista:ClavesCAI", ancho: 14, ayuda: "Elige de la lista (sale de la hoja CAI)" },
      { k: "no_deficiencia", h: "No. de deficiencia", req: "obl", tipo: "entero", ancho: 12, ayuda: "1, 2, 3…" },
      { k: "titulo", h: "Deficiencia (título)", req: "obl", tipo: "texto", ancho: 40, ayuda: "Nombre corto de la deficiencia" },
      { k: "descripcion", h: "Descripción de la deficiencia", req: "rec", tipo: "texto", ancho: 50, ayuda: "Condición / síntesis" },
      { k: "recomendacion", h: "Recomendación", req: "obl", tipo: "texto", ancho: 60, ayuda: "UNA recomendación por deficiencia" },
      { k: "responsables", h: "Responsables de implementarla", req: "rec", tipo: "texto", ancho: 36, ayuda: "Nombre y puesto" },
      { k: "fecha_implementacion", h: "Fecha de implementación", req: "obl", tipo: "fecha", ancho: 14, ayuda: "dd/mm/aaaa" },
      { k: "observaciones", h: "Notas (no se importa)", req: "no", tipo: "texto", ancho: 40, ayuda: "Para dudas o aclaraciones" },
    ],
  },
  SEG: {
    nombre: "Seguimientos",
    columnas: [
      { k: "cai_clave", h: "CAI", req: "obl", tipo: "lista:ClavesCAI", ancho: 14, ayuda: "Elige de la lista" },
      { k: "no_deficiencia", h: "No. de deficiencia", req: "obl", tipo: "entero", ancho: 12, ayuda: "La misma de la hoja Deficiencias" },
      { k: "no_seguimiento", h: "No. de seguimiento", req: "obl", tipo: "entero", ancho: 12, ayuda: "1 = primer seguimiento, 2 = segundo…" },
      { k: "tipo_documento", h: "Tipo de documento", req: "obl", tipo: "lista:TiposDocumento", ancho: 22, ayuda: "Elige de la lista" },
      { k: "no_nombramiento", h: "No. de nombramiento de seguimiento", req: "cond", tipo: "texto", ancho: 24, ayuda: "Obligatorio si es Nombramiento e informe" },
      { k: "fecha_nombramiento", h: "Fecha del nombramiento de seguimiento", req: "cond", tipo: "fecha", ancho: 16, ayuda: "Obligatorio si es Nombramiento e informe" },
      { k: "auditores", h: "Auditor(es) nombrado(s)", req: "obl", tipo: "texto", ancho: 30, ayuda: "Nombres completos, uno por línea" },
      { k: "no_documento", h: "No. de informe u oficio", req: "obl", tipo: "texto", ancho: 22, ayuda: "El informe u oficio emitido" },
      { k: "fecha_documento", h: "Fecha del informe u oficio", req: "obl", tipo: "fecha", ancho: 14, ayuda: "dd/mm/aaaa" },
      { k: "estado", h: "Estado de la recomendación", req: "obl", tipo: "lista:Estados", ancho: 16, ayuda: "Elige de la lista" },
      { k: "acciones", h: "Acciones de los responsables", req: "rec", tipo: "texto", ancho: 50, ayuda: "Qué hizo la dependencia" },
      { k: "comentario", h: "Comentario de auditoría", req: "obl", tipo: "texto", ancho: 50, ayuda: "Conclusión de auditoría" },
      { k: "fecha_sag", h: "Fecha de carga al SAG-UDAI", req: "rec", tipo: "fecha", ancho: 14, ayuda: "dd/mm/aaaa" },
      { k: "observaciones", h: "Notas (no se importa)", req: "no", tipo: "texto", ancho: 40, ayuda: "Para dudas o aclaraciones" },
    ],
  },
};

export const FILA_ENCABEZADO = 1;
export const FILA_AYUDA = 2;
export const PRIMERA_FILA_DATOS = 3;
export const FILAS_FORMATEADAS = 300;
