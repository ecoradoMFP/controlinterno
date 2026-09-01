-- Prompt maestro, sección 9: notificación activa cuando una actividad pasa a naranja o rojo.
-- El disparo (job diario, sección 9/5) queda desacoplado del canal de envío: hoy solo hay
-- centro de notificaciones in-app, pero esta tabla es el evento persistido, no el canal.
create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_nit text not null references usuarios(nit),
  actividad_id uuid not null references actividades(id) on delete cascade,
  -- Solo se alerta al entrar en naranja o rojo (sección 9); verde/amarillo son visibilidad
  -- pasiva de dashboard, no alerta activa.
  color text not null check (color in ('naranja', 'rojo')),
  mensaje text not null,
  leido boolean not null default false,
  created_at timestamptz not null default now()
);

create index notificaciones_usuario_nit_leido_idx on notificaciones(usuario_nit, leido);
create index notificaciones_actividad_id_idx on notificaciones(actividad_id, created_at desc);

alter table notificaciones enable row level security;

revoke all on notificaciones from anon, authenticated;
-- Sin insert para `authenticated`: solo el job de sistema (sección 12.2, cliente con
-- SUPABASE_SERVICE_ROLE_KEY que bypassea RLS) crea notificaciones. Un usuario puede leer las
-- suyas y marcarlas como leídas, nunca redactar el contenido de una alerta.
grant select, update on notificaciones to authenticated;

create policy notificaciones_select on notificaciones for select to authenticated
using (usuario_nit = authz.nit_actual());

create policy notificaciones_update on notificaciones for update to authenticated
using (usuario_nit = authz.nit_actual())
with check (usuario_nit = authz.nit_actual());
