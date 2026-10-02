-- Dos reglas de la captura de un CAI:
--  1. Corregir una deficiencia (título/descripción) igual que una recomendación: con motivo
--     obligatorio, historial append-only escrito por un trigger y sin permitirlo cuando ya hay
--     seguimientos evaluados sobre sus recomendaciones.
--  2. Bloquear el CAI: cerrada la captura ya no se agregan deficiencias ni recomendaciones, ni se
--     corrigen o eliminan, ni se cambia el equipo ni los datos del informe. Lo bloquea quien puede
--     operar el informe; desbloquearlo es de la jefatura (authz.puede_nombrar_seguimiento).
--     El seguimiento (nombramientos, evaluaciones, informes) NO se bloquea: es lo que sigue.

-- ── Bloqueo ──
alter table informes_auditoria
  add column bloqueado_en timestamptz,
  add column bloqueado_por_nit text references usuarios(nit);

create or replace function authz.cai_bloqueado(p_informe_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from informes_auditoria where id = p_informe_id and bloqueado_en is not null);
$$;
revoke execute on function authz.cai_bloqueado(uuid) from public, anon;
grant execute on function authz.cai_bloqueado(uuid) to authenticated;

create or replace function informes_auditoria_bloqueo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_otros_cambian boolean;
begin
  -- Solo usuarios de la aplicación (se mira el rol del JWT: dentro de security definer
  -- current_user es el dueño de la función).
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;

  -- anio_ejecucion es una columna generada: en un BEFORE trigger NEW todavía no la trae calculada.
  v_otros_cambian := (to_jsonb(new) - 'bloqueado_en' - 'bloqueado_por_nit' - 'anio_ejecucion')
    is distinct from (to_jsonb(old) - 'bloqueado_en' - 'bloqueado_por_nit' - 'anio_ejecucion');

  if old.bloqueado_en is null then
    if new.bloqueado_en is not null then
      if v_otros_cambian then
        raise exception 'Bloquea el CAI sin cambiar otros datos en el mismo paso';
      end if;
      new.bloqueado_en := now();
      new.bloqueado_por_nit := authz.nit_actual();
    else
      new.bloqueado_por_nit := null;
    end if;
    return new;
  end if;

  -- Ya estaba bloqueado: solo se permite desbloquearlo, y solo la jefatura.
  if new.bloqueado_en is null then
    if v_otros_cambian then
      raise exception 'Desbloquea el CAI sin cambiar otros datos en el mismo paso';
    end if;
    if not authz.puede_nombrar_seguimiento(old.departamento_id) then
      raise exception 'Solo la jefatura puede desbloquear un CAI';
    end if;
    new.bloqueado_por_nit := null;
    return new;
  end if;

  raise exception 'El CAI está bloqueado: no se puede modificar su informe';
end;
$$;
revoke execute on function informes_auditoria_bloqueo() from public, anon, authenticated;

create trigger informes_auditoria_bloqueo
before update on informes_auditoria
for each row execute function informes_auditoria_bloqueo();

create or replace function cai_bloqueo_hijas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_informe uuid;
  v_deficiencia uuid;
begin
  -- En un DELETE no existe NEW y en un INSERT no existe OLD: se lee solo el que corresponde.
  if tg_table_name = 'recomendaciones' then
    if tg_op = 'UPDATE'
       and new.texto is not distinct from old.texto
       and new.responsables is not distinct from old.responsables
       and new.fecha_implementacion is not distinct from old.fecha_implementacion
       and new.anulada_en is not distinct from old.anulada_en then
      -- Solo cambió el estado: lo mueve el seguimiento, que no se bloquea.
      return new;
    end if;
    v_deficiencia := case when tg_op = 'DELETE' then old.deficiencia_id else new.deficiencia_id end;
    select d.informe_id into v_informe from deficiencias d where d.id = v_deficiencia;
  else
    v_informe := case when tg_op = 'DELETE' then old.informe_id else new.informe_id end;
  end if;

  if authz.cai_bloqueado(v_informe) then
    raise exception 'El CAI está bloqueado: ya no se puede modificar su captura';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke execute on function cai_bloqueo_hijas() from public, anon, authenticated;

create trigger deficiencias_bloqueo
before insert or update on deficiencias
for each row execute function cai_bloqueo_hijas();

create trigger recomendaciones_bloqueo
before insert or update on recomendaciones
for each row execute function cai_bloqueo_hijas();

create trigger informes_auditoria_equipo_bloqueo
before insert or update or delete on informes_auditoria_equipo
for each row execute function cai_bloqueo_hijas();

-- ── Corrección de deficiencias ──
alter table deficiencias add column motivo_ultimo_cambio text;

create table deficiencias_historial (
  id uuid primary key default gen_random_uuid(),
  deficiencia_id uuid not null references deficiencias(id),
  informe_id uuid not null references informes_auditoria(id),
  datos_anteriores jsonb not null,
  datos_nuevos jsonb not null,
  motivo text not null check (length(btrim(motivo)) >= 5),
  usuario_nit text not null references usuarios(nit),
  created_at timestamptz not null default now()
);
create index deficiencias_historial_informe_idx on deficiencias_historial (informe_id, created_at desc);

alter table deficiencias_historial enable row level security;
grant select on deficiencias_historial to authenticated;  -- sin insert/update/delete: solo el trigger escribe
create policy deficiencias_historial_select on deficiencias_historial for select to authenticated
using (authz.puede_ver_informe(informe_id));

-- Solo estas columnas son editables por la app (número e informe nunca cambian).
revoke update on deficiencias from authenticated;
grant update (titulo, descripcion, motivo_ultimo_cambio) on deficiencias to authenticated;

create or replace function deficiencias_registrar_cambio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;

  if new.titulo is not distinct from old.titulo and new.descripcion is not distinct from old.descripcion then
    new.motivo_ultimo_cambio := null;
    return new;
  end if;

  if length(btrim(coalesce(new.motivo_ultimo_cambio, ''))) < 5 then
    raise exception 'Indica el motivo del cambio (mínimo 5 caracteres)';
  end if;
  if exists (
    select 1 from seguimientos_recomendacion s join recomendaciones r on r.id = s.recomendacion_id
    where r.deficiencia_id = old.id and s.numero_seguimiento > 0
  ) then
    raise exception 'La deficiencia ya tiene seguimientos evaluados: no se puede editar';
  end if;

  insert into deficiencias_historial (deficiencia_id, informe_id, datos_anteriores, datos_nuevos, motivo, usuario_nit)
  values (
    old.id, old.informe_id,
    jsonb_build_object('numero', old.numero, 'titulo', old.titulo, 'descripcion', old.descripcion),
    jsonb_build_object('numero', new.numero, 'titulo', new.titulo, 'descripcion', new.descripcion),
    btrim(new.motivo_ultimo_cambio),
    authz.nit_actual()
  );

  new.motivo_ultimo_cambio := null;
  return new;
end;
$$;
revoke execute on function deficiencias_registrar_cambio() from public, anon, authenticated;

create trigger deficiencias_registrar_cambio
before update on deficiencias
for each row execute function deficiencias_registrar_cambio();
