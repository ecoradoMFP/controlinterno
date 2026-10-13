import type { EtapaDocumentoEnum } from "@/types/domain";

/**
 * Las 8 actividades del resumen del cronograma con plazo en el SAG-UDAI-WEB (formato "Resumen
 * Cronograma" de los departamentos). Esos plazos se reportan a la Contraloría General de Cuentas,
 * por eso son las que mide el semáforo. La etapa sigue la hoja resumen de la DAI.
 */
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
