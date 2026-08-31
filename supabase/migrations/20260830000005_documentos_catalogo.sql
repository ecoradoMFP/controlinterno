-- Prompt maestro, sección 4.5: catálogo maestro de 18 documentos y su matriz de revisión
-- (documento × departamento × cargo). Datos sembrados en supabase/seed.sql.
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

-- Solo lectura: es dato maestro importado del Excel fuente (sección 4.5.1), no editable
-- desde la aplicación en el MVP.
grant select on documentos_catalogo to authenticated;
grant select on documentos_catalogo_revision to authenticated;
