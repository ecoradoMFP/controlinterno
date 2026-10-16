create table usuarios (
  nit text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nombre text not null,
  puesto text,
  correo text not null unique,
  departamento_id uuid references departamentos(id),
  cargo cargo_enum,
  permiso_sistema permiso_sistema_enum not null default 'consulta',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index usuarios_departamento_id_idx on usuarios(departamento_id);
create index usuarios_cargo_idx on usuarios(cargo);

alter table subdirecciones
  add constraint subdirecciones_subdirector_nit_fkey
  foreign key (subdirector_nit) references usuarios(nit);

alter table usuarios enable row level security;

revoke all on usuarios from anon, authenticated;
grant select on usuarios to authenticated;
