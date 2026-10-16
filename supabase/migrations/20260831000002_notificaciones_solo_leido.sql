create or replace function notificaciones_solo_leido_editable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.usuario_nit is distinct from old.usuario_nit
     or new.actividad_id is distinct from old.actividad_id
     or new.color is distinct from old.color
     or new.mensaje is distinct from old.mensaje
     or new.created_at is distinct from old.created_at
  then
    raise exception 'notificaciones: el destinatario solo puede modificar el campo leido';
  end if;
  return new;
end;
$$;

revoke execute on function notificaciones_solo_leido_editable() from public, anon, authenticated;

create trigger notificaciones_solo_leido
  before update on notificaciones
  for each row execute function notificaciones_solo_leido_editable();
