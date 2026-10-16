create table capacitaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_nit text not null references usuarios(nit),
  nombre text not null,
  institucion text not null,
  horas numeric(5,2) not null check (horas > 0),
  fecha date not null,
  anio integer generated always as (extract(year from fecha)::int) stored,
  certificado_url text,
  registrado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now()
);

create index capacitaciones_usuario_nit_idx on capacitaciones(usuario_nit);
create index capacitaciones_anio_idx on capacitaciones(anio);

alter table capacitaciones enable row level security;

revoke all on capacitaciones from anon, authenticated;
grant select, insert, update, delete on capacitaciones to authenticated;

create or replace function authz.tiene_cargo_gestion_capacitaciones()
returns boolean
language sql stable security definer set search_path = public
as $$
  select case authz.cargo_actual()
    when 'jefe' then true
    when 'subjefe' then true
    when 'subdirector' then true
    when 'director' then true
    else false
  end;
$$;

grant execute on function authz.tiene_cargo_gestion_capacitaciones() to authenticated;

create or replace function authz.puede_gestionar_capacitaciones(p_departamento_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    authz.puede_escribir()
    and authz.tiene_cargo_gestion_capacitaciones()
    and (
      authz.es_director()
      or (p_departamento_id is not null and p_departamento_id in (select authz.departamentos_visibles()))
    );
$$;

grant execute on function authz.puede_gestionar_capacitaciones(uuid) to authenticated;

create policy capacitaciones_select on capacitaciones for select to authenticated
using (exists (select 1 from usuarios u where u.nit = usuario_nit));

create policy capacitaciones_insert on capacitaciones for insert to authenticated
with check (
  registrado_por_nit = authz.nit_actual()
  and (
    (authz.puede_escribir() and authz.tiene_cargo_gestion_capacitaciones() and usuario_nit = authz.nit_actual())
    or exists (select 1 from usuarios u where u.nit = usuario_nit and authz.puede_gestionar_capacitaciones(u.departamento_id))
  )
);

create policy capacitaciones_update on capacitaciones for update to authenticated
using (
  (authz.puede_escribir() and authz.tiene_cargo_gestion_capacitaciones() and usuario_nit = authz.nit_actual())
  or exists (select 1 from usuarios u where u.nit = usuario_nit and authz.puede_gestionar_capacitaciones(u.departamento_id))
)
with check (
  (authz.puede_escribir() and authz.tiene_cargo_gestion_capacitaciones() and usuario_nit = authz.nit_actual())
  or exists (select 1 from usuarios u where u.nit = usuario_nit and authz.puede_gestionar_capacitaciones(u.departamento_id))
);

create policy capacitaciones_delete on capacitaciones for delete to authenticated
using (
  (authz.puede_escribir() and authz.tiene_cargo_gestion_capacitaciones() and usuario_nit = authz.nit_actual())
  or exists (select 1 from usuarios u where u.nit = usuario_nit and authz.puede_gestionar_capacitaciones(u.departamento_id))
);
