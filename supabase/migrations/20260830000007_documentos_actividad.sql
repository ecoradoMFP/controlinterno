create table documentos_actividad (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividades(id) on delete cascade,
  documento_catalogo_id uuid not null references documentos_catalogo(id),
  hito_id uuid references hitos_cronograma(id),
  fase_actual fase_documento_enum not null default 'elaboracion',
  cargo_actual_responsable cargo_enum not null,
  created_at timestamptz not null default now(),
  unique (actividad_id, documento_catalogo_id)
);

create index documentos_actividad_actividad_id_idx on documentos_actividad(actividad_id);
create index documentos_actividad_fase_actual_idx on documentos_actividad(fase_actual);

alter table documentos_actividad enable row level security;

revoke all on documentos_actividad from anon, authenticated;
grant select, insert, update on documentos_actividad to authenticated;
