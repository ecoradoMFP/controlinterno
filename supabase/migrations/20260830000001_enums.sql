-- Prompt maestro, sección 4: tipos enumerados usados por el modelo de datos.
create extension if not exists pgcrypto;

create type cargo_enum as enum ('auditor', 'subjefe', 'jefe', 'subdirector', 'director');
create type permiso_sistema_enum as enum ('captura_propia', 'captura_delegada', 'consulta', 'control_total');
create type etapa_actividad_enum as enum ('planificacion', 'ejecucion', 'comunicacion_resultados', 'expediente_cierre');
create type etapa_documento_enum as enum ('planificacion', 'ejecucion', 'comunicacion_resultados');
create type fase_documento_enum as enum ('elaboracion', 'revision', 'correccion', 'finalizado');
create type estado_hito_enum as enum ('pendiente', 'en_curso', 'concluido');
create type tipo_evento_movimiento_enum as enum ('entrega', 'recepcion', 'aprobacion', 'devolucion_correccion', 'registro_tardio');
create type ambito_semaforo_enum as enum ('hito', 'oficio', 'actividad');
