create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_nit text not null references usuarios(nit),
  actividad_id uuid not null references actividades(id) on delete cascade,
  color text not null check (color in ('naranja', 'rojo')),
  mensaje text not null,
  leido boolean not null default false,
  created_at timestamptz not null default now()
);

create index notificaciones_usuario_nit_leido_idx on notificaciones(usuario_nit, leido);
create index notificaciones_actividad_id_idx on notificaciones(actividad_id, created_at desc);

alter table notificaciones enable row level security;

revoke all on notificaciones from anon, authenticated;
grant select, update on notificaciones to authenticated;

create policy notificaciones_select on notificaciones for select to authenticated
using (usuario_nit = authz.nit_actual());

create policy notificaciones_update on notificaciones for update to authenticated
using (usuario_nit = authz.nit_actual())
with check (usuario_nit = authz.nit_actual());
