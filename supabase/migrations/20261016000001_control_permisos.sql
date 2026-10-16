create type tipo_permiso_personal_enum as enum (
  'asunto_personal', 'cita_medica', 'entrada_tardia', 'comision_oficial', 'nota_marcaje'
);

create table permisos_encargados (
  usuario_nit text primary key references usuarios(nit),
  asignado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now()
);

alter table permisos_encargados enable row level security;
revoke all on permisos_encargados from anon, authenticated;
grant select, insert, delete on permisos_encargados to authenticated;

create or replace function authz.es_encargado_permisos()
returns boolean
language sql stable security definer set search_path = public
as $$
  select authz.puede_escribir()
    and exists (select 1 from permisos_encargados e where e.usuario_nit = authz.nit_actual());
$$;

create or replace function authz.puede_registrar_permisos()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(authz.permiso_actual() = 'control_total', false) or authz.es_encargado_permisos();
$$;

grant execute on function authz.es_encargado_permisos() to authenticated;
grant execute on function authz.puede_registrar_permisos() to authenticated;

create policy permisos_encargados_select on permisos_encargados for select to authenticated
using (authz.permiso_actual() = 'control_total' or usuario_nit = authz.nit_actual());

create policy permisos_encargados_insert on permisos_encargados for insert to authenticated
with check (authz.permiso_actual() = 'control_total' and asignado_por_nit = authz.nit_actual());

create policy permisos_encargados_delete on permisos_encargados for delete to authenticated
using (authz.permiso_actual() = 'control_total');

drop policy usuarios_select on usuarios;
create policy usuarios_select on usuarios for select to authenticated
using (
  authz.es_director()
  or nit = authz.nit_actual()
  or departamento_id in (select authz.departamentos_visibles())
  or authz.es_encargado_permisos()
);

create table permisos_personal (
  id uuid primary key default gen_random_uuid(),
  usuario_nit text not null references usuarios(nit),
  fecha date not null,
  tipo tipo_permiso_personal_enum not null,
  hora_inicio time,
  hora_fin time,
  motivo text not null check (length(trim(motivo)) > 0),
  minutos integer generated always as (
    case when hora_inicio is null then 0 else (extract(epoch from (hora_fin - hora_inicio)) / 60)::int end
  ) stored,
  anio integer generated always as (extract(year from fecha)::int) stored,
  mes integer generated always as (extract(month from fecha)::int) stored,
  registrado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint permisos_personal_horario check (
    (tipo = 'nota_marcaje' and hora_inicio is null and hora_fin is null)
    or (
      tipo <> 'nota_marcaje'
      and hora_inicio is not null and hora_fin is not null
      and hora_inicio >= time '08:00' and hora_fin <= time '16:30'
      and hora_fin > hora_inicio
    )
  ),
  constraint permisos_personal_entrada_tardia check (tipo <> 'entrada_tardia' or hora_inicio = time '08:00')
);

create index permisos_personal_usuario_idx on permisos_personal(usuario_nit, fecha);
create index permisos_personal_anio_idx on permisos_personal(anio, mes);

alter table permisos_personal enable row level security;
revoke all on permisos_personal from anon, authenticated;
grant select, insert, update, delete on permisos_personal to authenticated;

create policy permisos_personal_select on permisos_personal for select to authenticated
using (
  usuario_nit = authz.nit_actual()
  or authz.puede_registrar_permisos()
  or authz.es_director()
  or exists (
    select 1 from usuarios u
    where u.nit = usuario_nit
      and authz.cargo_actual() in ('jefe', 'subjefe', 'subdirector')
      and u.departamento_id in (select authz.departamentos_visibles())
  )
);

create policy permisos_personal_insert on permisos_personal for insert to authenticated
with check (authz.puede_registrar_permisos() and registrado_por_nit = authz.nit_actual());

create policy permisos_personal_update on permisos_personal for update to authenticated
using (authz.puede_registrar_permisos())
with check (authz.puede_registrar_permisos());

create policy permisos_personal_delete on permisos_personal for delete to authenticated
using (authz.puede_registrar_permisos());

create table permisos_personal_historial (
  id bigint generated always as identity primary key,
  permiso_id uuid not null,
  usuario_nit text not null,
  operacion text not null check (operacion in ('correccion', 'eliminacion')),
  datos_anteriores jsonb not null,
  realizado_por_nit text,
  realizado_en timestamptz not null default now()
);

create index permisos_personal_historial_permiso_idx on permisos_personal_historial(permiso_id);

alter table permisos_personal_historial enable row level security;
revoke all on permisos_personal_historial from anon, authenticated;
grant select on permisos_personal_historial to authenticated;

create policy permisos_personal_historial_select on permisos_personal_historial for select to authenticated
using (authz.puede_registrar_permisos() or authz.es_director());

create or replace function public.registrar_historial_permiso()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.registrado_por_nit := old.registrado_por_nit;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  insert into permisos_personal_historial (permiso_id, usuario_nit, operacion, datos_anteriores, realizado_por_nit)
  values (
    old.id,
    old.usuario_nit,
    case tg_op when 'UPDATE' then 'correccion' else 'eliminacion' end,
    to_jsonb(old),
    authz.nit_actual()
  );
  return case tg_op when 'UPDATE' then new else old end;
end;
$$;

revoke execute on function public.registrar_historial_permiso() from public, anon, authenticated;

create trigger permisos_personal_historial_upd
before update on permisos_personal
for each row execute function public.registrar_historial_permiso();

create trigger permisos_personal_historial_del
before delete on permisos_personal
for each row execute function public.registrar_historial_permiso();
