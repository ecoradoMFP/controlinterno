alter table documentos_seguimiento
  add column coordinador_nit text references usuarios(nit),
  add column fecha_limite_informe date;

alter table documentos_seguimiento add constraint documentos_seguimiento_coordinacion_requerida
  check (tipo_documento = 'oficio' or (coordinador_nit is not null and fecha_limite_informe is not null)) not valid;
