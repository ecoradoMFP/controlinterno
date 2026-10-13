-- Fechas de recibido del nombramiento y de la Declaración de Independencia: la primera captura
-- sigue igual (cualquiera que opere la auditoría), pero una fecha ya registrada solo la corrige
-- la jefatura (Subjefe, Jefe, Subdirector, Director o control_total), con motivo obligatorio.
-- Nunca se sobrescribe en silencio: cada corrección queda en una bitácora inalterable con la
-- fecha anterior, la nueva, el motivo y quién la hizo.

create table actividades_equipo_correcciones (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividades(id) on delete cascade,
  usuario_nit text not null references usuarios(nit),
  campo text not null check (campo in ('recibido', 'declaracion')),
  fecha_anterior date not null,
  fecha_nueva date not null,
  motivo text not null check (length(btrim(motivo)) >= 10),
  registrado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now()
);

create index actividades_equipo_correcciones_actividad_idx on actividades_equipo_correcciones(actividad_id);

alter table actividades_equipo_correcciones enable row level security;

create policy actividades_equipo_correcciones_select on actividades_equipo_correcciones for select to authenticated
using (authz.puede_ver_actividad(actividad_id));

-- Sin políticas de insert/update/delete: solo escribe `corregir_fecha_equipo` (SECURITY DEFINER).
revoke insert, update, delete on actividades_equipo_correcciones from anon, authenticated;

-- Una fecha ya registrada solo cambia dentro de `corregir_fecha_equipo` (o por control_total o
-- conexiones sin usuario: scripts y service role).
create or replace function proteger_fechas_equipo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if ((old.fecha_recibido is not null and new.fecha_recibido is distinct from old.fecha_recibido)
      or (old.fecha_declaracion_independencia is not null
          and new.fecha_declaracion_independencia is distinct from old.fecha_declaracion_independencia))
     and auth.uid() is not null
     and coalesce(current_setting('scidai.correccion_fecha_equipo', true), '') <> 'on'
     and coalesce(authz.permiso_actual() <> 'control_total', true)
  then
    raise exception 'Una fecha ya registrada solo la corrige la jefatura, indicando el motivo.';
  end if;
  return new;
end;
$$;

revoke execute on function proteger_fechas_equipo() from public, anon, authenticated;

create trigger actividades_equipo_proteger_fechas
  before update on actividades_equipo
  for each row execute function proteger_fechas_equipo();

create or replace function corregir_fecha_equipo(
  p_actividad_id uuid,
  p_usuario_nit text,
  p_campo text,
  p_fecha date,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cargo cargo_enum := authz.cargo_actual();
  v_anterior date;
begin
  if not coalesce(authz.puede_operar_actividad(p_actividad_id), false) then
    raise exception 'No tiene acceso a esta auditoría.';
  end if;
  if coalesce(authz.permiso_actual() <> 'control_total', true)
     and (v_cargo is null or v_cargo not in ('subjefe', 'jefe', 'subdirector', 'director'))
  then
    raise exception 'Corregir una fecha ya registrada es decisión de la jefatura (Subjefe, Jefe, Subdirector o Director).';
  end if;
  if p_campo not in ('recibido', 'declaracion') then
    raise exception 'Campo no reconocido.';
  end if;
  if p_fecha is null then
    raise exception 'Indique la nueva fecha.';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Escriba el motivo de la corrección (al menos 10 caracteres).';
  end if;

  select case when p_campo = 'recibido' then fecha_recibido else fecha_declaracion_independencia end
    into v_anterior
    from actividades_equipo
   where actividad_id = p_actividad_id and usuario_nit = p_usuario_nit
   for update;

  if not found then
    raise exception 'No se encontró al integrante en el equipo de esta auditoría.';
  end if;
  if v_anterior is null then
    raise exception 'Esa fecha todavía no se ha registrado: captúrala normalmente.';
  end if;
  if v_anterior = p_fecha then
    raise exception 'La nueva fecha es igual a la registrada.';
  end if;

  insert into actividades_equipo_correcciones (actividad_id, usuario_nit, campo, fecha_anterior, fecha_nueva, motivo, registrado_por_nit)
  values (p_actividad_id, p_usuario_nit, p_campo, v_anterior, p_fecha, btrim(p_motivo), authz.nit_actual());

  perform set_config('scidai.correccion_fecha_equipo', 'on', true);
  if p_campo = 'recibido' then
    update actividades_equipo set fecha_recibido = p_fecha
     where actividad_id = p_actividad_id and usuario_nit = p_usuario_nit;
  else
    update actividades_equipo set fecha_declaracion_independencia = p_fecha
     where actividad_id = p_actividad_id and usuario_nit = p_usuario_nit;
  end if;
  perform set_config('scidai.correccion_fecha_equipo', '', true);
end;
$$;

revoke execute on function corregir_fecha_equipo(uuid, text, text, date, text) from public, anon;
grant execute on function corregir_fecha_equipo(uuid, text, text, date, text) to authenticated;
