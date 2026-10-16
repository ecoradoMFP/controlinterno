alter table documentos_seguimiento drop constraint documentos_seguimiento_coordinacion_requerida;

alter table documentos_seguimiento add constraint documentos_seguimiento_fecha_limite_requerida
  check (tipo_documento = 'oficio' or fecha_limite_informe is not null) not valid;
