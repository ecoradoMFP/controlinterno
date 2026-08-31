-- Prompt maestro, sección 4.3: usuarios. PK es el NIT (identificador de negocio); la
-- credencial de acceso es Supabase Auth, enlazada vía auth_user_id (sección 8).
create table usuarios (
  nit text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nombre text not null,
  puesto text,
  correo text not null unique,
  -- nullable: personal no jerárquico (ej. asistente de archivo) puede no tener depto fijo.
  departamento_id uuid references departamentos(id),
  cargo cargo_enum,
  -- Sección 12.4/12.6: por defecto el permiso más restrictivo (least privilege); se eleva
  -- explícitamente al dar de alta a alguien, nunca se asume un permiso de escritura.
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
-- Solo lectura para la app; el alta/edición de usuarios (identidad, cargo, permiso_sistema)
-- es un flujo administrativo fuera de RLS de aplicación (sección 12.4), no un CRUD expuesto
-- a los propios usuarios finales — así ningún usuario puede auto-otorgarse un cargo o permiso.
grant select on usuarios to authenticated;
