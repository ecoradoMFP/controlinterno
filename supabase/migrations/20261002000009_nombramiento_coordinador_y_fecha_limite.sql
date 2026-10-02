-- Todo nombramiento de seguimiento designa una coordinadora/coordinador y fija la fecha límite para
-- notificar el informe (así lo trae el nombramiento real). Se piden al registrar el nombramiento;
-- un oficio (excepcional, sin nombramiento) no los lleva. NOT VALID: no reprueba lo ya cargado.
alter table documentos_seguimiento
  add column coordinador_nit text references usuarios(nit),
  add column fecha_limite_informe date;

alter table documentos_seguimiento add constraint documentos_seguimiento_coordinacion_requerida
  check (tipo_documento = 'oficio' or (coordinador_nit is not null and fecha_limite_informe is not null)) not valid;
