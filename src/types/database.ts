export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      actividades: {
        Row: {
          auditor_principal_nit: string
          created_at: string
          departamento_id: string
          dependencia_auditada: string
          etapa_actual: Database["public"]["Enums"]["etapa_actividad_enum"]
          expedientes_relacionados: string[]
          fecha_inicio_plazo: string
          fecha_notificacion: string
          id: string
          no_nombramiento: string
          periodo_evaluado_fin: string
          periodo_evaluado_inicio: string
          tipo_auditoria: string
        }
        Insert: {
          auditor_principal_nit: string
          created_at?: string
          departamento_id: string
          dependencia_auditada: string
          etapa_actual?: Database["public"]["Enums"]["etapa_actividad_enum"]
          expedientes_relacionados?: string[]
          fecha_inicio_plazo: string
          fecha_notificacion: string
          id?: string
          no_nombramiento: string
          periodo_evaluado_fin: string
          periodo_evaluado_inicio: string
          tipo_auditoria: string
        }
        Update: {
          auditor_principal_nit?: string
          created_at?: string
          departamento_id?: string
          dependencia_auditada?: string
          etapa_actual?: Database["public"]["Enums"]["etapa_actividad_enum"]
          expedientes_relacionados?: string[]
          fecha_inicio_plazo?: string
          fecha_notificacion?: string
          id?: string
          no_nombramiento?: string
          periodo_evaluado_fin?: string
          periodo_evaluado_inicio?: string
          tipo_auditoria?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividades_auditor_principal_nit_fkey"
            columns: ["auditor_principal_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
          {
            foreignKeyName: "actividades_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      actividades_equipo: {
        Row: {
          actividad_id: string
          fecha_declaracion_independencia: string | null
          fecha_recibido: string | null
          rol_en_equipo: string | null
          usuario_nit: string
        }
        Insert: {
          actividad_id: string
          fecha_declaracion_independencia?: string | null
          fecha_recibido?: string | null
          rol_en_equipo?: string | null
          usuario_nit: string
        }
        Update: {
          actividad_id?: string
          fecha_declaracion_independencia?: string | null
          fecha_recibido?: string | null
          rol_en_equipo?: string | null
          usuario_nit?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividades_equipo_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_equipo_usuario_nit_fkey"
            columns: ["usuario_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      actividades_etapa_historial: {
        Row: {
          actividad_id: string
          cerrado_por_nit: string
          etapa_cerrada: Database["public"]["Enums"]["etapa_actividad_enum"]
          etapa_siguiente: Database["public"]["Enums"]["etapa_actividad_enum"]
          id: string
          timestamp: string
        }
        Insert: {
          actividad_id: string
          cerrado_por_nit: string
          etapa_cerrada: Database["public"]["Enums"]["etapa_actividad_enum"]
          etapa_siguiente: Database["public"]["Enums"]["etapa_actividad_enum"]
          id?: string
          timestamp?: string
        }
        Update: {
          actividad_id?: string
          cerrado_por_nit?: string
          etapa_cerrada?: Database["public"]["Enums"]["etapa_actividad_enum"]
          etapa_siguiente?: Database["public"]["Enums"]["etapa_actividad_enum"]
          id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividades_etapa_historial_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_etapa_historial_cerrado_por_nit_fkey"
            columns: ["cerrado_por_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      calendario_feriados: {
        Row: {
          descripcion: string
          fecha: string
        }
        Insert: {
          descripcion: string
          fecha: string
        }
        Update: {
          descripcion?: string
          fecha?: string
        }
        Relationships: []
      }
      capacitaciones: {
        Row: {
          anio: number | null
          certificado_url: string | null
          created_at: string
          fecha: string
          horas: number
          id: string
          institucion: string
          nombre: string
          registrado_por_nit: string
          usuario_nit: string
        }
        Insert: {
          anio?: never
          certificado_url?: string | null
          created_at?: string
          fecha: string
          horas: number
          id?: string
          institucion: string
          nombre: string
          registrado_por_nit: string
          usuario_nit: string
        }
        Update: {
          anio?: never
          certificado_url?: string | null
          created_at?: string
          fecha?: string
          horas?: number
          id?: string
          institucion?: string
          nombre?: string
          registrado_por_nit?: string
          usuario_nit?: string
        }
        Relationships: [
          {
            foreignKeyName: "capacitaciones_registrado_por_nit_fkey"
            columns: ["registrado_por_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
          {
            foreignKeyName: "capacitaciones_usuario_nit_fkey"
            columns: ["usuario_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      deficiencias: {
        Row: {
          creado_por_nit: string
          created_at: string
          descripcion: string | null
          id: string
          informe_id: string
          numero: number
          titulo: string
        }
        Insert: {
          creado_por_nit: string
          created_at?: string
          descripcion?: string | null
          id?: string
          informe_id: string
          numero: number
          titulo: string
        }
        Update: {
          creado_por_nit?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          informe_id?: string
          numero?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "deficiencias_creado_por_nit_fkey"
            columns: ["creado_por_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
          {
            foreignKeyName: "deficiencias_informe_id_fkey"
            columns: ["informe_id"]
            isOneToOne: false
            referencedRelation: "informes_auditoria"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          created_at: string
          id: string
          nombre: string
          subdireccion_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          subdireccion_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          subdireccion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_subdireccion_id_fkey"
            columns: ["subdireccion_id"]
            isOneToOne: false
            referencedRelation: "subdirecciones"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_actividad: {
        Row: {
          actividad_id: string
          cargo_actual_responsable: Database["public"]["Enums"]["cargo_enum"]
          created_at: string
          documento_catalogo_id: string
          fase_actual: Database["public"]["Enums"]["fase_documento_enum"]
          hito_id: string | null
          id: string
        }
        Insert: {
          actividad_id: string
          cargo_actual_responsable: Database["public"]["Enums"]["cargo_enum"]
          created_at?: string
          documento_catalogo_id: string
          fase_actual?: Database["public"]["Enums"]["fase_documento_enum"]
          hito_id?: string | null
          id?: string
        }
        Update: {
          actividad_id?: string
          cargo_actual_responsable?: Database["public"]["Enums"]["cargo_enum"]
          created_at?: string
          documento_catalogo_id?: string
          fase_actual?: Database["public"]["Enums"]["fase_documento_enum"]
          hito_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_actividad_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_actividad_documento_catalogo_id_fkey"
            columns: ["documento_catalogo_id"]
            isOneToOne: false
            referencedRelation: "documentos_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_actividad_hito_id_fkey"
            columns: ["hito_id"]
            isOneToOne: false
            referencedRelation: "hitos_cronograma"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_catalogo: {
        Row: {
          etapa: Database["public"]["Enums"]["etapa_documento_enum"]
          id: string
          nombre: string
          observaciones: string | null
          orden: number
        }
        Insert: {
          etapa: Database["public"]["Enums"]["etapa_documento_enum"]
          id?: string
          nombre: string
          observaciones?: string | null
          orden: number
        }
        Update: {
          etapa?: Database["public"]["Enums"]["etapa_documento_enum"]
          id?: string
          nombre?: string
          observaciones?: string | null
          orden?: number
        }
        Relationships: []
      }
      documentos_catalogo_revision: {
        Row: {
          cargo: Database["public"]["Enums"]["cargo_enum"]
          departamento_id: string
          documento_catalogo_id: string
          orden_revision: number
        }
        Insert: {
          cargo: Database["public"]["Enums"]["cargo_enum"]
          departamento_id: string
          documento_catalogo_id: string
          orden_revision: number
        }
        Update: {
          cargo?: Database["public"]["Enums"]["cargo_enum"]
          departamento_id?: string
          documento_catalogo_id?: string
          orden_revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "documentos_catalogo_revision_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_catalogo_revision_documento_catalogo_id_fkey"
            columns: ["documento_catalogo_id"]
            isOneToOne: false
            referencedRelation: "documentos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_seguimiento: {
        Row: {
          creado_por_nit: string
          created_at: string
          departamento_id: string
          fecha_carga_sag_udai: string | null
          fecha_documento: string | null
          fecha_nombramiento: string | null
          id: string
          no_documento: string | null
          no_nombramiento: string | null
          tipo_documento: Database["public"]["Enums"]["tipo_documento_seguimiento_enum"]
        }
        Insert: {
          creado_por_nit: string
          created_at?: string
          departamento_id: string
          fecha_carga_sag_udai?: string | null
          fecha_documento?: string | null
          fecha_nombramiento?: string | null
          id?: string
          no_documento?: string | null
          no_nombramiento?: string | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento_seguimiento_enum"]
        }
        Update: {
          creado_por_nit?: string
          created_at?: string
          departamento_id?: string
          fecha_carga_sag_udai?: string | null
          fecha_documento?: string | null
          fecha_nombramiento?: string | null
          id?: string
          no_documento?: string | null
          no_nombramiento?: string | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento_seguimiento_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "documentos_seguimiento_creado_por_nit_fkey"
            columns: ["creado_por_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
          {
            foreignKeyName: "documentos_seguimiento_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_seguimiento_auditores: {
        Row: {
          documento_id: string
          usuario_nit: string
        }
        Insert: {
          documento_id: string
          usuario_nit: string
        }
        Update: {
          documento_id?: string
          usuario_nit?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_seguimiento_auditores_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_seguimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_seguimiento_auditores_usuario_nit_fkey"
            columns: ["usuario_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      documentos_seguimiento_informes: {
        Row: {
          documento_id: string
          informe_id: string
        }
        Insert: {
          documento_id: string
          informe_id: string
        }
        Update: {
          documento_id?: string
          informe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_seguimiento_informes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_seguimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_seguimiento_informes_informe_id_fkey"
            columns: ["informe_id"]
            isOneToOne: false
            referencedRelation: "informes_auditoria"
            referencedColumns: ["id"]
          },
        ]
      }
      hitos_cronograma: {
        Row: {
          actividad_id: string
          cargo_responsable: Database["public"]["Enums"]["cargo_enum"]
          codigo_jerarquico: string
          dias_habiles_esperados: number
          documento_catalogo_id: string | null
          estado: Database["public"]["Enums"]["estado_hito_enum"]
          etapa: Database["public"]["Enums"]["etapa_documento_enum"]
          fecha_fin_esperada: string
          fecha_fin_real: string | null
          fecha_inicio_esperada: string
          id: string
          nombre: string
        }
        Insert: {
          actividad_id: string
          cargo_responsable: Database["public"]["Enums"]["cargo_enum"]
          codigo_jerarquico: string
          dias_habiles_esperados: number
          documento_catalogo_id?: string | null
          estado?: Database["public"]["Enums"]["estado_hito_enum"]
          etapa: Database["public"]["Enums"]["etapa_documento_enum"]
          fecha_fin_esperada: string
          fecha_fin_real?: string | null
          fecha_inicio_esperada: string
          id?: string
          nombre: string
        }
        Update: {
          actividad_id?: string
          cargo_responsable?: Database["public"]["Enums"]["cargo_enum"]
          codigo_jerarquico?: string
          dias_habiles_esperados?: number
          documento_catalogo_id?: string | null
          estado?: Database["public"]["Enums"]["estado_hito_enum"]
          etapa?: Database["public"]["Enums"]["etapa_documento_enum"]
          fecha_fin_esperada?: string
          fecha_fin_real?: string | null
          fecha_inicio_esperada?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "hitos_cronograma_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hitos_cronograma_documento_catalogo_id_fkey"
            columns: ["documento_catalogo_id"]
            isOneToOne: false
            referencedRelation: "documentos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      informes_auditoria: {
        Row: {
          anio_ejecucion: number | null
          cai: string | null
          coordinador_nit: string | null
          creado_por_nit: string
          created_at: string
          departamento_id: string
          dependencia_auditada: string
          fecha_informe_final: string | null
          fecha_nombramiento: string | null
          fecha_notificacion: string | null
          id: string
          no_nombramiento: string | null
          periodo_auditado_fin: string | null
          periodo_auditado_inicio: string | null
          riesgo: string | null
          supervisor_nit: string | null
          tipo_auditoria: string | null
        }
        Insert: {
          anio_ejecucion?: never
          cai?: string | null
          coordinador_nit?: string | null
          creado_por_nit: string
          created_at?: string
          departamento_id: string
          dependencia_auditada: string
          fecha_informe_final?: string | null
          fecha_nombramiento?: string | null
          fecha_notificacion?: string | null
          id?: string
          no_nombramiento?: string | null
          periodo_auditado_fin?: string | null
          periodo_auditado_inicio?: string | null
          riesgo?: string | null
          supervisor_nit?: string | null
          tipo_auditoria?: string | null
        }
        Update: {
          anio_ejecucion?: never
          cai?: string | null
          coordinador_nit?: string | null
          creado_por_nit?: string
          created_at?: string
          departamento_id?: string
          dependencia_auditada?: string
          fecha_informe_final?: string | null
          fecha_nombramiento?: string | null
          fecha_notificacion?: string | null
          id?: string
          no_nombramiento?: string | null
          periodo_auditado_fin?: string | null
          periodo_auditado_inicio?: string | null
          riesgo?: string | null
          supervisor_nit?: string | null
          tipo_auditoria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "informes_auditoria_coordinador_nit_fkey"
            columns: ["coordinador_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
          {
            foreignKeyName: "informes_auditoria_creado_por_nit_fkey"
            columns: ["creado_por_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
          {
            foreignKeyName: "informes_auditoria_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "informes_auditoria_supervisor_nit_fkey"
            columns: ["supervisor_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      informes_auditoria_equipo: {
        Row: {
          informe_id: string
          usuario_nit: string
        }
        Insert: {
          informe_id: string
          usuario_nit: string
        }
        Update: {
          informe_id?: string
          usuario_nit?: string
        }
        Relationships: [
          {
            foreignKeyName: "informes_auditoria_equipo_informe_id_fkey"
            columns: ["informe_id"]
            isOneToOne: false
            referencedRelation: "informes_auditoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "informes_auditoria_equipo_usuario_nit_fkey"
            columns: ["usuario_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      movimientos: {
        Row: {
          a_cargo: Database["public"]["Enums"]["cargo_enum"]
          de_cargo: Database["public"]["Enums"]["cargo_enum"] | null
          documento_actividad_id: string
          es_correccion_direccion: boolean
          id: string
          observacion: string | null
          registrado_por_nit: string
          timestamp: string
          tipo_evento: Database["public"]["Enums"]["tipo_evento_movimiento_enum"]
        }
        Insert: {
          a_cargo: Database["public"]["Enums"]["cargo_enum"]
          de_cargo?: Database["public"]["Enums"]["cargo_enum"] | null
          documento_actividad_id: string
          es_correccion_direccion?: boolean
          id?: string
          observacion?: string | null
          registrado_por_nit: string
          timestamp?: string
          tipo_evento: Database["public"]["Enums"]["tipo_evento_movimiento_enum"]
        }
        Update: {
          a_cargo?: Database["public"]["Enums"]["cargo_enum"]
          de_cargo?: Database["public"]["Enums"]["cargo_enum"] | null
          documento_actividad_id?: string
          es_correccion_direccion?: boolean
          id?: string
          observacion?: string | null
          registrado_por_nit?: string
          timestamp?: string
          tipo_evento?: Database["public"]["Enums"]["tipo_evento_movimiento_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_documento_actividad_id_fkey"
            columns: ["documento_actividad_id"]
            isOneToOne: false
            referencedRelation: "documentos_actividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_registrado_por_nit_fkey"
            columns: ["registrado_por_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      notificaciones: {
        Row: {
          actividad_id: string
          color: string
          created_at: string
          id: string
          leido: boolean
          mensaje: string
          usuario_nit: string
        }
        Insert: {
          actividad_id: string
          color: string
          created_at?: string
          id?: string
          leido?: boolean
          mensaje: string
          usuario_nit: string
        }
        Update: {
          actividad_id?: string
          color?: string
          created_at?: string
          id?: string
          leido?: boolean
          mensaje?: string
          usuario_nit?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_usuario_nit_fkey"
            columns: ["usuario_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      oficios: {
        Row: {
          actividad_id: string | null
          asunto: string
          created_at: string
          destinatario: string
          fecha_emision: string
          fecha_envio: string | null
          fecha_recepcion: string | null
          fecha_respuesta: string | null
          fecha_vencimiento: string | null
          id: string
          medio_envio: string | null
          no_oficio: string
          no_respuesta: string | null
          observaciones: string | null
          plazo_respuesta_dias: number | null
          puesto_destinatario: string | null
          responsable_elaboracion_nit: string
        }
        Insert: {
          actividad_id?: string | null
          asunto: string
          created_at?: string
          destinatario: string
          fecha_emision: string
          fecha_envio?: string | null
          fecha_recepcion?: string | null
          fecha_respuesta?: string | null
          fecha_vencimiento?: string | null
          id?: string
          medio_envio?: string | null
          no_oficio: string
          no_respuesta?: string | null
          observaciones?: string | null
          plazo_respuesta_dias?: number | null
          puesto_destinatario?: string | null
          responsable_elaboracion_nit: string
        }
        Update: {
          actividad_id?: string | null
          asunto?: string
          created_at?: string
          destinatario?: string
          fecha_emision?: string
          fecha_envio?: string | null
          fecha_recepcion?: string | null
          fecha_respuesta?: string | null
          fecha_vencimiento?: string | null
          id?: string
          medio_envio?: string | null
          no_oficio?: string
          no_respuesta?: string | null
          observaciones?: string | null
          plazo_respuesta_dias?: number | null
          puesto_destinatario?: string | null
          responsable_elaboracion_nit?: string
        }
        Relationships: [
          {
            foreignKeyName: "oficios_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oficios_responsable_elaboracion_nit_fkey"
            columns: ["responsable_elaboracion_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      oficios_firmantes: {
        Row: {
          oficio_id: string
          usuario_nit: string
        }
        Insert: {
          oficio_id: string
          usuario_nit: string
        }
        Update: {
          oficio_id?: string
          usuario_nit?: string
        }
        Relationships: [
          {
            foreignKeyName: "oficios_firmantes_oficio_id_fkey"
            columns: ["oficio_id"]
            isOneToOne: false
            referencedRelation: "oficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oficios_firmantes_usuario_nit_fkey"
            columns: ["usuario_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      oficios_revisores: {
        Row: {
          oficio_id: string
          usuario_nit: string
        }
        Insert: {
          oficio_id: string
          usuario_nit: string
        }
        Update: {
          oficio_id?: string
          usuario_nit?: string
        }
        Relationships: [
          {
            foreignKeyName: "oficios_revisores_oficio_id_fkey"
            columns: ["oficio_id"]
            isOneToOne: false
            referencedRelation: "oficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oficios_revisores_usuario_nit_fkey"
            columns: ["usuario_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      parametros_semaforo: {
        Row: {
          ambito: Database["public"]["Enums"]["ambito_semaforo_enum"]
          id: string
          umbral_amarillo_pct: number
          umbral_naranja_pct: number
          umbral_verde_pct: number
        }
        Insert: {
          ambito: Database["public"]["Enums"]["ambito_semaforo_enum"]
          id?: string
          umbral_amarillo_pct: number
          umbral_naranja_pct: number
          umbral_verde_pct: number
        }
        Update: {
          ambito?: Database["public"]["Enums"]["ambito_semaforo_enum"]
          id?: string
          umbral_amarillo_pct?: number
          umbral_naranja_pct?: number
          umbral_verde_pct?: number
        }
        Relationships: []
      }
      recomendaciones: {
        Row: {
          creado_por_nit: string
          created_at: string
          deficiencia_id: string
          estado_actual: Database["public"]["Enums"]["estado_recomendacion_enum"]
          fecha_implementacion: string | null
          id: string
          numero: number
          responsables: string | null
          texto: string
        }
        Insert: {
          creado_por_nit: string
          created_at?: string
          deficiencia_id: string
          estado_actual?: Database["public"]["Enums"]["estado_recomendacion_enum"]
          fecha_implementacion?: string | null
          id?: string
          numero: number
          responsables?: string | null
          texto: string
        }
        Update: {
          creado_por_nit?: string
          created_at?: string
          deficiencia_id?: string
          estado_actual?: Database["public"]["Enums"]["estado_recomendacion_enum"]
          fecha_implementacion?: string | null
          id?: string
          numero?: number
          responsables?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "recomendaciones_creado_por_nit_fkey"
            columns: ["creado_por_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
          {
            foreignKeyName: "recomendaciones_deficiencia_id_fkey"
            columns: ["deficiencia_id"]
            isOneToOne: false
            referencedRelation: "deficiencias"
            referencedColumns: ["id"]
          },
        ]
      }
      seguimientos_recomendacion: {
        Row: {
          acciones_responsables: string | null
          comentario_auditoria: string | null
          created_at: string
          documento_id: string | null
          estado: Database["public"]["Enums"]["estado_recomendacion_enum"]
          id: string
          numero_seguimiento: number
          recomendacion_id: string
          registrado_por_nit: string
        }
        Insert: {
          acciones_responsables?: string | null
          comentario_auditoria?: string | null
          created_at?: string
          documento_id?: string | null
          estado: Database["public"]["Enums"]["estado_recomendacion_enum"]
          id?: string
          numero_seguimiento: number
          recomendacion_id: string
          registrado_por_nit: string
        }
        Update: {
          acciones_responsables?: string | null
          comentario_auditoria?: string | null
          created_at?: string
          documento_id?: string | null
          estado?: Database["public"]["Enums"]["estado_recomendacion_enum"]
          id?: string
          numero_seguimiento?: number
          recomendacion_id?: string
          registrado_por_nit?: string
        }
        Relationships: [
          {
            foreignKeyName: "seguimientos_recomendacion_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_seguimiento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimientos_recomendacion_recomendacion_id_fkey"
            columns: ["recomendacion_id"]
            isOneToOne: false
            referencedRelation: "recomendaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimientos_recomendacion_registrado_por_nit_fkey"
            columns: ["registrado_por_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      subdirecciones: {
        Row: {
          created_at: string
          id: string
          nombre: string
          subdirector_nit: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          subdirector_nit?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          subdirector_nit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subdirecciones_subdirector_nit_fkey"
            columns: ["subdirector_nit"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["nit"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          auth_user_id: string | null
          cargo: Database["public"]["Enums"]["cargo_enum"] | null
          correo: string
          created_at: string
          departamento_id: string | null
          nit: string
          nombre: string
          permiso_sistema: Database["public"]["Enums"]["permiso_sistema_enum"]
          puesto: string | null
        }
        Insert: {
          activo?: boolean
          auth_user_id?: string | null
          cargo?: Database["public"]["Enums"]["cargo_enum"] | null
          correo: string
          created_at?: string
          departamento_id?: string | null
          nit: string
          nombre: string
          permiso_sistema?: Database["public"]["Enums"]["permiso_sistema_enum"]
          puesto?: string | null
        }
        Update: {
          activo?: boolean
          auth_user_id?: string | null
          cargo?: Database["public"]["Enums"]["cargo_enum"] | null
          correo?: string
          created_at?: string
          departamento_id?: string | null
          nit?: string
          nombre?: string
          permiso_sistema?: Database["public"]["Enums"]["permiso_sistema_enum"]
          puesto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ambito_semaforo_enum: "hito" | "oficio" | "actividad"
      cargo_enum: "auditor" | "subjefe" | "jefe" | "subdirector" | "director"
      estado_hito_enum: "pendiente" | "en_curso" | "concluido"
      estado_recomendacion_enum:
        "pendiente" | "en_proceso" | "no_cumplida" | "cumplida"
      etapa_actividad_enum:
        | "planificacion"
        | "ejecucion"
        | "comunicacion_resultados"
        | "expediente_cierre"
      etapa_documento_enum:
        "planificacion" | "ejecucion" | "comunicacion_resultados"
      fase_documento_enum:
        "elaboracion" | "revision" | "correccion" | "finalizado"
      permiso_sistema_enum:
        "captura_propia" | "captura_delegada" | "consulta" | "control_total"
      tipo_documento_seguimiento_enum: "informe" | "oficio"
      tipo_evento_movimiento_enum:
        | "entrega"
        | "recepcion"
        | "aprobacion"
        | "devolucion_correccion"
        | "registro_tardio"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ambito_semaforo_enum: ["hito", "oficio", "actividad"],
      cargo_enum: ["auditor", "subjefe", "jefe", "subdirector", "director"],
      estado_hito_enum: ["pendiente", "en_curso", "concluido"],
      estado_recomendacion_enum: [
        "pendiente",
        "en_proceso",
        "no_cumplida",
        "cumplida",
      ],
      etapa_actividad_enum: [
        "planificacion",
        "ejecucion",
        "comunicacion_resultados",
        "expediente_cierre",
      ],
      etapa_documento_enum: [
        "planificacion",
        "ejecucion",
        "comunicacion_resultados",
      ],
      fase_documento_enum: [
        "elaboracion",
        "revision",
        "correccion",
        "finalizado",
      ],
      permiso_sistema_enum: [
        "captura_propia",
        "captura_delegada",
        "consulta",
        "control_total",
      ],
      tipo_documento_seguimiento_enum: ["informe", "oficio"],
      tipo_evento_movimiento_enum: [
        "entrega",
        "recepcion",
        "aprobacion",
        "devolucion_correccion",
        "registro_tardio",
      ],
    },
  },
} as const
