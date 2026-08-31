-- Prompt maestro, sección 4.6: cronograma sistematizado de cada actividad (fuente de fechas
-- para el motor de semáforo, sección 5).
create table hitos_cronograma (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividades(id) on delete cascade,
  etapa etapa_documento_enum not null,
  codigo_jerarquico text not null,
  nombre text not null,
  fecha_inicio_esperada date not null,
  fecha_fin_esperada date not null,
  dias_habiles_esperados int not null check (dias_habiles_esperados >= 0),
  cargo_responsable cargo_enum not null,
  documento_catalogo_id uuid references documentos_catalogo(id),
  fecha_fin_real date,
  estado estado_hito_enum not null default 'pendiente',
  check (fecha_fin_esperada >= fecha_inicio_esperada),
  unique (actividad_id, codigo_jerarquico)
);

create index hitos_cronograma_actividad_id_idx on hitos_cronograma(actividad_id);
create index hitos_cronograma_estado_idx on hitos_cronograma(estado);
create index hitos_cronograma_fecha_fin_esperada_idx on hitos_cronograma(fecha_fin_esperada);

alter table hitos_cronograma enable row level security;

revoke all on hitos_cronograma from anon, authenticated;
grant select, insert, update on hitos_cronograma to authenticated;
-- Sin delete: un hito ya capturado no se borra, se corrige (mismo principio de la sección 6.5).
