import type { EtapaDocumentoEnum } from "@/types/domain";

export const ACTIVIDADES_SAG_UDAI: { codigo: string; nombre: string; etapa: EtapaDocumentoEnum }[] = [
  { codigo: "1", nombre: "Preparación del trabajo", etapa: "planificacion" },
  { codigo: "2", nombre: "Realización del trabajo", etapa: "ejecucion" },
  { codigo: "3", nombre: "Determinación de deficiencias", etapa: "ejecucion" },
  { codigo: "4", nombre: "Elaboración de conclusiones preliminares", etapa: "comunicacion_resultados" },
  { codigo: "5", nombre: "Notificación de conclusiones preliminares", etapa: "comunicacion_resultados" },
  { codigo: "6", nombre: "Argumentos de los responsables", etapa: "comunicacion_resultados" },
  { codigo: "7", nombre: "Análisis de respuestas", etapa: "comunicacion_resultados" },
  { codigo: "8", nombre: "Elaboración de conclusión final", etapa: "comunicacion_resultados" },
];
