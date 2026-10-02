-- El número de CAI se reinicia cada año (hay un CAI 00001 de 2025 y otro de 2026): el CAI se
-- identifica por número + año. El año es un dato explícito (el del CAI, normalmente el del
-- informe de auditoría), no se deduce de ninguna fecha.
alter table informes_auditoria add column anio_cai smallint check (anio_cai between 2000 and 2100);

-- Mismo CAI en el mismo año no puede repetirse. Los CAI anteriores a esta regla (sin año) no se tocan.
create unique index informes_auditoria_cai_anio_idx on informes_auditoria (cai, anio_cai)
  where cai is not null and anio_cai is not null;

-- Todo CAI nuevo lleva su año (NOT VALID: no reprueba filas históricas sin él).
alter table informes_auditoria add constraint informes_auditoria_anio_cai_requerido
  check (anio_cai is not null) not valid;
