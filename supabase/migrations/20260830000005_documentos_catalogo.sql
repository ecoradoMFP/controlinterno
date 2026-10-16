create table documentos_catalogo (
  id uuid primary key default gen_random_uuid(),
  etapa etapa_documento_enum not null,
  orden int not null,
  nombre text not null,
  observaciones text,
  unique (etapa, orden)
);

create table documentos_catalogo_revision (
  documento_catalogo_id uuid not null references documentos_catalogo(id) on delete cascade,
  departamento_id uuid not null references departamentos(id),
  cargo cargo_enum not null,
  orden_revision int not null,
  primary key (documento_catalogo_id, departamento_id, cargo),
  unique (documento_catalogo_id, departamento_id, orden_revision)
);

alter table documentos_catalogo enable row level security;
alter table documentos_catalogo_revision enable row level security;

revoke all on documentos_catalogo from anon, authenticated;
revoke all on documentos_catalogo_revision from anon, authenticated;

grant select on documentos_catalogo to authenticated;
grant select on documentos_catalogo_revision to authenticated;
