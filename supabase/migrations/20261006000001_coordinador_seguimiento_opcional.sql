-- No todos los departamentos designan coordinador en el nombramiento de seguimiento (Especiales no
-- lo hace): el coordinador pasa a ser opcional. La fecha límite para notificar el informe sigue
-- siendo obligatoria en todo nombramiento; un oficio no lleva ninguno de los dos.
alter table documentos_seguimiento drop constraint documentos_seguimiento_coordinacion_requerida;

alter table documentos_seguimiento add constraint documentos_seguimiento_fecha_limite_requerida
  check (tipo_documento = 'oficio' or fecha_limite_informe is not null) not valid;
