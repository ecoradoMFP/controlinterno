-- Prompt maestro, sección 4.1-4.2: estructura organizacional fija (2 subdirecciones, 3 departamentos).
create table subdirecciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  -- FK a usuarios(nit) se agrega en 20260830000003_usuarios.sql, una vez existe esa tabla.
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

-- Sección 12.2/12.3: sin acceso por defecto; cada tabla concede explícitamente lo mínimo
-- necesario y el resto queda bloqueado tanto por falta de GRANT como por RLS.
revoke all on subdirecciones from anon, authenticated;
revoke all on departamentos from anon, authenticated;

-- Datos de referencia (bajo alcance de sensibilidad): lectura para cualquier usuario autenticado.
-- Sin insert/update/delete: la estructura organizacional es fija y se administra por migración/seed,
-- no por CRUD de aplicación (sección 1: "fijo, no configurable en el MVP").
grant select on subdirecciones to authenticated;
grant select on departamentos to authenticated;
