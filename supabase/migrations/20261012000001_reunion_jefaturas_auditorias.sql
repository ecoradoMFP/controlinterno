-- Respuestas de las jefaturas (cuestionario de 2026-10-12) para el flujo de Auditorías (CAI):
--
-- 1. Ampliación temporal de nombramiento (1.2): alguien cubre por un período el puesto de
--    Subjefe o Jefe de un departamento. Se registra con vigencia y
--    queda en bitácora; durante la vigencia el sistema le da los permisos de ese cargo.
-- 2. Pasos 2 y 7 de Planificación (1.3/1.4): se manejan como documentos (temporalmente), y el
--    paso 7 se llama "Gestión de Áreas (Muestreo y Asignación de Áreas, Métodos a utilizar)".
-- 3. Corrección de movimientos por Dirección (1.5, indispensable): registro tardío con la fecha
--    real del hecho y corrección de un movimiento puntual, sin borrar nada de la bitácora.
-- 4. Seguimiento de CAI (2.5): el auditor y el coordinador nombrados deben ser del departamento
--    que nombra.
-- 5. Trigger de carga al SAG-UDAI: robusto ante sesiones de scripts.

-- ── 1. Cargos temporales ──
create table cargos_temporales (
  id uuid primary key default gen_random_uuid(),
  usuario_nit text not null references usuarios(nit),
  cargo cargo_enum not null check (cargo in ('subjefe', 'jefe')),
  departamento_id uuid not null references departamentos(id),
  fecha_inicio date not null,
  fecha_fin date not null,
  documento_respaldo text not null check (length(btrim(documento_respaldo)) > 0),
  motivo text not null check (length(btrim(motivo)) >= 10),
  registrado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now(),
  revocado_en timestamptz,
  revocado_por_nit text references usuarios(nit),
  motivo_revocacion text,
  check (fecha_fin >= fecha_inicio),
  check (
    (revocado_en is null and revocado_por_nit is null and motivo_revocacion is null)
    or (revocado_en is not null and revocado_por_nit is not null and length(btrim(coalesce(motivo_revocacion, ''))) >= 10)
  )
);

create index cargos_temporales_usuario_idx on cargos_temporales (usuario_nit, fecha_inicio, fecha_fin);
create index cargos_temporales_departamento_idx on cargos_temporales (departamento_id);

-- Hoy en Guatemala (no la fecha del servidor, que está en UTC).
create or replace function authz.hoy_guatemala()
returns date
language sql stable
set search_path = public
as $$
  select (now() at time zone 'America/Guatemala')::date;
$$;

-- El cargo y departamento EFECTIVOS: los del usuario, salvo que tenga un cargo temporal vigente
-- hoy. Todas las funciones authz (y con ellas RLS) pasan por aquí, así la ampliación da los
-- permisos del cargo solo mientras dura.
create or replace function authz.usuario_actual()
returns usuarios
language sql stable security definer set search_path = public
as $$
  select u.nit, u.auth_user_id, u.nombre, u.puesto, u.correo,
         coalesce(t.departamento_id, u.departamento_id),
         coalesce(t.cargo, u.cargo),
         u.permiso_sistema, u.activo, u.created_at
  from usuarios u
  left join lateral (
    select ct.cargo, ct.departamento_id
    from cargos_temporales ct
    where ct.usuario_nit = u.nit
      and ct.revocado_en is null
      and authz.hoy_guatemala() between ct.fecha_inicio and ct.fecha_fin
    order by ct.created_at desc
    limit 1
  ) t on true
  where u.auth_user_id = auth.uid();
$$;

-- Lo registra la Dirección (Director o Subdirector). Se usa el cargo REAL: un cargo temporal
-- nunca es de Dirección (solo subjefe/jefe), así que efectivo y real coinciden aquí.
create or replace function authz.puede_registrar_cargo_temporal()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(authz.cargo_actual() in ('director', 'subdirector'), false)
     and coalesce(authz.puede_escribir(), false);
$$;

create or replace function validar_cargo_temporal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    -- Solo se puede revocar (terminar antes), una vez y con motivo; lo demás es bitácora.
    if (to_jsonb(new) - array['revocado_en', 'revocado_por_nit', 'motivo_revocacion'])
       is distinct from (to_jsonb(old) - array['revocado_en', 'revocado_por_nit', 'motivo_revocacion']) then
      raise exception 'Un cargo temporal registrado no se modifica: si hay un error, revócalo con motivo y registra otro.';
    end if;
    if old.revocado_en is not null then
      raise exception 'Este cargo temporal ya fue revocado.';
    end if;
    return new;
  end if;

  if not exists (select 1 from usuarios u where u.nit = new.usuario_nit and u.activo) then
    raise exception 'La persona no existe o está inactiva.';
  end if;
  if exists (
    select 1 from cargos_temporales ct
    where ct.usuario_nit = new.usuario_nit
      and ct.revocado_en is null
      and daterange(ct.fecha_inicio, ct.fecha_fin, '[]') && daterange(new.fecha_inicio, new.fecha_fin, '[]')
  ) then
    raise exception 'Esa persona ya tiene un cargo temporal en esas fechas.';
  end if;
  return new;
end;
$$;

revoke execute on function validar_cargo_temporal() from public, anon, authenticated;

create trigger cargos_temporales_validar
  before insert or update on cargos_temporales
  for each row execute function validar_cargo_temporal();

create or replace function bloquear_delete_cargos_temporales()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Los cargos temporales son bitácora: no se borran, se revocan con motivo.';
end;
$$;

revoke execute on function bloquear_delete_cargos_temporales() from public, anon, authenticated;

create trigger cargos_temporales_sin_delete
  before delete on cargos_temporales
  for each row execute function bloquear_delete_cargos_temporales();

alter table cargos_temporales enable row level security;
revoke all on cargos_temporales from anon, authenticated;
grant select, insert on cargos_temporales to authenticated;
grant update (revocado_en, revocado_por_nit, motivo_revocacion) on cargos_temporales to authenticated;

create policy cargos_temporales_select on cargos_temporales for select to authenticated
using (
  authz.cargo_actual() in ('director', 'subdirector')
  or usuario_nit = authz.nit_actual()
  or departamento_id in (select authz.departamentos_visibles())
);

create policy cargos_temporales_insert on cargos_temporales for insert to authenticated
with check (authz.puede_registrar_cargo_temporal() and registrado_por_nit = authz.nit_actual());

create policy cargos_temporales_update on cargos_temporales for update to authenticated
using (authz.puede_registrar_cargo_temporal())
with check (authz.puede_registrar_cargo_temporal() and revocado_por_nit = authz.nit_actual());

-- La app lee el cargo efectivo con esto (getUsuarioActual), para mostrar y ofrecer lo mismo que
-- RLS permite.
create or replace function mi_cargo_temporal()
returns table (cargo cargo_enum, departamento_id uuid, fecha_fin date, documento_respaldo text)
language sql stable security definer set search_path = public
as $$
  select ct.cargo, ct.departamento_id, ct.fecha_fin, ct.documento_respaldo
  from cargos_temporales ct
  where ct.usuario_nit = authz.nit_actual()
    and ct.revocado_en is null
    and authz.hoy_guatemala() between ct.fecha_inicio and ct.fecha_fin
  order by ct.created_at desc
  limit 1;
$$;

revoke execute on function mi_cargo_temporal() from public, anon;
grant execute on function mi_cargo_temporal() to authenticated;

-- ── 2. Pasos 2 y 7 como documentos ──
update documentos_catalogo
   set nombre = 'Gestión de Áreas (Muestreo y Asignación de Áreas, Métodos a utilizar)'
 where etapa = 'planificacion' and orden = 7;
update documentos_catalogo set genera_documento = true where etapa = 'planificacion' and orden in (2, 7);

-- Los documentos ya iniciados de esos pasos no tenían ruta (no generaban archivo).
update documentos_actividad da
   set ruta_archivo = a.ruta_expediente || '/' || lpad(dc.orden::text, 2, '0') || ' ' || ruta_segmento(dc.nombre)
  from actividades a, documentos_catalogo dc
 where a.id = da.actividad_id and dc.id = da.documento_catalogo_id
   and dc.etapa = 'planificacion' and dc.orden in (2, 7)
   and a.ruta_expediente is not null;

-- ── 3. Corrección de movimientos por Dirección ──
-- `timestamp` sigue siendo CUÁNDO OCURRIÓ (lo usan la hoja de ruta y los tableros);
-- `registrado_en` es cuándo se escribió. Solo un registro de Dirección puede llevar una fecha
-- pasada (registro tardío) o corregir un movimiento anterior, que queda visible pero marcado.
alter table movimientos
  add column registrado_en timestamptz,
  add column corrige_movimiento_id uuid references movimientos(id);

alter table movimientos disable trigger movimientos_sin_update;
update movimientos set registrado_en = "timestamp";
alter table movimientos enable trigger movimientos_sin_update;

alter table movimientos
  alter column registrado_en set not null,
  alter column registrado_en set default now(),
  add constraint movimientos_correccion_solo_direccion check (corrige_movimiento_id is null or es_correccion_direccion),
  add constraint movimientos_corrige_una_vez unique (corrige_movimiento_id);

create index movimientos_corrige_idx on movimientos (corrige_movimiento_id) where corrige_movimiento_id is not null;

create or replace function validar_fecha_movimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc_corregido uuid;
begin
  -- Conexiones sin usuario (migraciones, scripts de carga) registran historia con sus fechas.
  if auth.uid() is null then
    return new;
  end if;

  new.registrado_en := now();

  if not new.es_correccion_direccion then
    -- El trabajo diario no elige la fecha: es la del momento en que se registra.
    new."timestamp" := now();
    return new;
  end if;

  if new."timestamp" > now() + interval '5 minutes' then
    raise exception 'La fecha del movimiento no puede ser futura.';
  end if;

  if new.corrige_movimiento_id is not null then
    select documento_actividad_id into v_doc_corregido from movimientos where id = new.corrige_movimiento_id;
    if v_doc_corregido is distinct from new.documento_actividad_id then
      raise exception 'El movimiento que se corrige debe ser del mismo documento.';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function validar_fecha_movimiento() from public, anon, authenticated;

create trigger movimientos_validar_fecha
  before insert on movimientos
  for each row execute function validar_fecha_movimiento();

-- ── 4. Auditor y coordinador del nombramiento de seguimiento: del mismo departamento ──
create or replace function validar_departamento_nombrado_seguimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nit text;
  v_documento_departamento uuid;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_table_name = 'documentos_seguimiento_auditores' then
    v_nit := new.usuario_nit;
    select departamento_id into v_documento_departamento from documentos_seguimiento where id = new.documento_id;
  else
    v_nit := new.coordinador_nit;
    v_documento_departamento := new.departamento_id;
    if v_nit is null or (tg_op = 'UPDATE' and v_nit is not distinct from old.coordinador_nit) then
      return new;
    end if;
  end if;

  if not exists (select 1 from usuarios u where u.nit = v_nit and u.departamento_id = v_documento_departamento) then
    raise exception 'En el seguimiento de CAI solo se nombra a personal del departamento que emite el nombramiento.';
  end if;
  return new;
end;
$$;

revoke execute on function validar_departamento_nombrado_seguimiento() from public, anon, authenticated;

create trigger documentos_seguimiento_auditores_mismo_departamento
  before insert on documentos_seguimiento_auditores
  for each row execute function validar_departamento_nombrado_seguimiento();

create trigger documentos_seguimiento_coordinador_mismo_departamento
  before insert or update of coordinador_nit on documentos_seguimiento
  for each row execute function validar_departamento_nombrado_seguimiento();

-- ── 5. Carga al SAG-UDAI desde scripts ──
-- Postgres no garantiza el corto circuito del AND: con la sesión de un script (service_role) se
-- llegaba a evaluar authz.es_director() y fallaba por permisos del esquema authz. Se anida el if.
create or replace function documentos_seguimiento_proteger_sag_udai()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.fecha_carga_sag_udai is distinct from old.fecha_carga_sag_udai
     and coalesce(auth.jwt() ->> 'role', '') = 'authenticated' then
    if not authz.es_director() then
      raise exception 'Solo el Director puede registrar la carga al SAG-UDAI';
    end if;
  end if;
  return new;
end;
$$;
