import type { Database } from "./database";

export type Tables = Database["public"]["Tables"];

export type Usuario = Tables["usuarios"]["Row"];
export type Departamento = Tables["departamentos"]["Row"];
export type Subdireccion = Tables["subdirecciones"]["Row"];
export type Actividad = Tables["actividades"]["Row"];
export type ActividadInsert = Tables["actividades"]["Insert"];
export type ActividadEquipo = Tables["actividades_equipo"]["Row"];
export type DocumentoCatalogo = Tables["documentos_catalogo"]["Row"];
export type DocumentoCatalogoRevision = Tables["documentos_catalogo_revision"]["Row"];
export type HitoCronograma = Tables["hitos_cronograma"]["Row"];
export type DocumentoActividad = Tables["documentos_actividad"]["Row"];
export type Movimiento = Tables["movimientos"]["Row"];
export type MovimientoInsert = Tables["movimientos"]["Insert"];
export type Oficio = Tables["oficios"]["Row"];
export type OficioInsert = Tables["oficios"]["Insert"];
export type ParametroSemaforo = Tables["parametros_semaforo"]["Row"];
export type CalendarioFeriado = Tables["calendario_feriados"]["Row"];
export type Notificacion = Tables["notificaciones"]["Row"];

export type CargoEnum = Database["public"]["Enums"]["cargo_enum"];
export type PermisoSistemaEnum = Database["public"]["Enums"]["permiso_sistema_enum"];
export type EtapaActividadEnum = Database["public"]["Enums"]["etapa_actividad_enum"];
export type EtapaDocumentoEnum = Database["public"]["Enums"]["etapa_documento_enum"];
export type FaseDocumentoEnum = Database["public"]["Enums"]["fase_documento_enum"];
export type EstadoHitoEnum = Database["public"]["Enums"]["estado_hito_enum"];
export type TipoEventoMovimientoEnum = Database["public"]["Enums"]["tipo_evento_movimiento_enum"];
export type AmbitoSemaforoEnum = Database["public"]["Enums"]["ambito_semaforo_enum"];

export const CARGOS: CargoEnum[] = ["auditor", "subjefe", "jefe", "subdirector", "director"];

export const CARGO_LABELS: Record<CargoEnum, string> = {
  auditor: "Auditor",
  subjefe: "Subjefe",
  jefe: "Jefe",
  subdirector: "Subdirector",
  director: "Director",
};

export const ETAPA_ACTIVIDAD_LABELS: Record<EtapaActividadEnum, string> = {
  planificacion: "Planificación",
  ejecucion: "Ejecución",
  comunicacion_resultados: "Comunicación de Resultados",
  expediente_cierre: "Expediente / Cierre",
};

export const AMBITO_SEMAFORO_LABELS: Record<AmbitoSemaforoEnum, string> = {
  hito: "Hitos de cronograma",
  oficio: "Oficios",
  actividad: "Actividad (general)",
};

export const ETAPA_DOCUMENTO_LABELS: Record<EtapaDocumentoEnum, string> = {
  planificacion: "Planificación",
  ejecucion: "Ejecución",
  comunicacion_resultados: "Comunicación de Resultados",
};

export const FASE_DOCUMENTO_LABELS: Record<FaseDocumentoEnum, string> = {
  elaboracion: "Elaboración",
  revision: "Revisión",
  correccion: "Corrección",
  finalizado: "Finalizado",
};

export const TIPO_EVENTO_LABELS: Record<TipoEventoMovimientoEnum, string> = {
  entrega: "Entrega",
  recepcion: "Recepción",
  aprobacion: "Aprobación",
  devolucion_correccion: "Devolución para corrección",
  registro_tardio: "Registro tardío",
};
