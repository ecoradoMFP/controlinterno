create table subdirecciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  subdirector_nit text,
  created_at timestamptz not null default now()
);

create table departamentos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  subdireccion_id uuid not null references subdirecciones(id),
  created_at timestamptz not null default now()
);

create index departamentos_subdireccion_id_idx on departamentos(subdireccion_id);

alter table subdirecciones enable row level security;
alter table departamentos enable row level security;

revoke all on subdirecciones from anon, authenticated;
revoke all on departamentos from anon, authenticated;

grant select on subdirecciones to authenticated;
grant select on departamentos to authenticated;
