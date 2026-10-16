alter table informes_auditoria add column anio_cai smallint check (anio_cai between 2000 and 2100);

create unique index informes_auditoria_cai_anio_idx on informes_auditoria (cai, anio_cai)
  where cai is not null and anio_cai is not null;

alter table informes_auditoria add constraint informes_auditoria_anio_cai_requerido
  check (anio_cai is not null) not valid;
