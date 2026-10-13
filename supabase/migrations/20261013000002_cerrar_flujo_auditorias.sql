-- Cierre del flujo de Auditorías (CAI):
--
-- 1. Plazos del cronograma (SAG-UDAI-WEB, se reportan a la CGC): una vez registrados solo los
--    corrige la jefatura, con motivo, y cada corrección queda en una bitácora inalterable.
-- 2. Datos generales de la auditoría (dependencia, período, auditor principal, plazos): los
--    corrige la jefatura con motivo, con la misma bitácora. El CAI, el departamento y el tipo no
--    cambian (de ellos dependen el identificador y la carpeta del expediente).
-- 3. No se cierra Planificación sin cronograma registrado.
-- 4. Cerrar una etapa es un solo paso: concluye con la fecha del cierre las actividades del
--    cronograma de esa etapa que sigan abiertas, avanza la etapa y deja el historial.

-- Días hábiles entre dos fechas (inclusive), sin fines de semana ni asuetos: mismo cálculo que
-- `diasHabilesEntre` en la app.
create or replace function dias_habiles(p_desde date, p_hasta date)
returns integer
language sql stable
set search_path = public
as $$
  select count(*)::integer
  from generate_series(p_desde, p_hasta, interval '1 day') d
  where extract(isodow from d) < 6
    and not exists (select 1 from calendario_feriados f where f.fecha = d::date);
$$;

-- Jefatura que puede corregir: Subjefe, Jefe, Subdirector, Director o control total.
create or replace function authz.es_jefatura_auditoria()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(authz.permiso_actual() = 'control_total', false)
      or coalesce(authz.cargo_actual() in ('subjefe', 'jefe', 'subdirector', 'director'), false);
$$;

revoke execute on function authz.es_jefatura_auditoria() from public, anon;
grant execute on function authz.es_jefatura_auditoria() to authenticated;

-- ── 1. Correcciones de plazos del cronograma ──
create table hitos_cronograma_correcciones (
  id uuid primary key default gen_random_uuid(),
  hito_id uuid not null references hitos_cronograma(id) on delete cascade,
  actividad_id uuid not null references actividades(id) on delete cascade,
  inicio_anterior date not null,
  fin_anterior date not null,
  inicio_nuevo date not null,
  fin_nuevo date not null,
  motivo text not null check (length(btrim(motivo)) >= 10),
  registrado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now()
);

create index hitos_cronograma_correcciones_actividad_idx on hitos_cronograma_correcciones (actividad_id);

alter table hitos_cronograma_correcciones enable row level security;
create policy hitos_cronograma_correcciones_select on hitos_cronograma_correcciones for select to authenticated
using (authz.puede_ver_actividad(actividad_id));
revoke insert, update, delete on hitos_cronograma_correcciones from anon, authenticated;

create or replace function proteger_plazos_cronograma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.fecha_inicio_esperada is distinct from old.fecha_inicio_esperada
      or new.fecha_fin_esperada is distinct from old.fecha_fin_esperada
      or new.dias_habiles_esperados is distinct from old.dias_habiles_esperados)
     and auth.uid() is not null
     and coalesce(current_setting('scidai.correccion_cronograma', true), '') <> 'on'
  then
    raise exception 'Los plazos del cronograma solo los corrige la jefatura, indicando el motivo.';
  end if;
  return new;
end;
$$;

revoke execute on function proteger_plazos_cronograma() from public, anon, authenticated;

create trigger hitos_cronograma_proteger_plazos
  before update on hitos_cronograma
  for each row execute function proteger_plazos_cronograma();

create or replace function corregir_plazo_cronograma(
  p_hito_id uuid,
  p_inicio date,
  p_fin date,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hito hitos_cronograma%rowtype;
begin
  select * into v_hito from hitos_cronograma where id = p_hito_id for update;
  if not found or not coalesce(authz.puede_operar_actividad(v_hito.actividad_id), false) then
    raise exception 'No tiene acceso a esta auditoría.';
  end if;
  if not authz.es_jefatura_auditoria() then
    raise exception 'Corregir un plazo del cronograma es decisión de la jefatura (Subjefe, Jefe, Subdirector o Director).';
  end if;
  if v_hito.fecha_fin_real is not null then
    raise exception 'Esa actividad ya está concluida; su plazo ya no se corrige.';
  end if;
  if p_inicio is null or p_fin is null or p_fin < p_inicio then
    raise exception 'Revise las fechas: la fecha "Al" no puede ser anterior a "Del".';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Escriba el motivo de la corrección (al menos 10 caracteres).';
  end if;
  if p_inicio = v_hito.fecha_inicio_esperada and p_fin = v_hito.fecha_fin_esperada then
    raise exception 'Las fechas son iguales a las registradas.';
  end if;

  insert into hitos_cronograma_correcciones
    (hito_id, actividad_id, inicio_anterior, fin_anterior, inicio_nuevo, fin_nuevo, motivo, registrado_por_nit)
  values
    (p_hito_id, v_hito.actividad_id, v_hito.fecha_inicio_esperada, v_hito.fecha_fin_esperada, p_inicio, p_fin,
     btrim(p_motivo), authz.nit_actual());

  perform set_config('scidai.correccion_cronograma', 'on', true);
  update hitos_cronograma
     set fecha_inicio_esperada = p_inicio,
         fecha_fin_esperada = p_fin,
         dias_habiles_esperados = dias_habiles(p_inicio, p_fin)
   where id = p_hito_id;
  perform set_config('scidai.correccion_cronograma', '', true);
end;
$$;

revoke execute on function corregir_plazo_cronograma(uuid, date, date, text) from public, anon;
grant execute on function corregir_plazo_cronograma(uuid, date, date, text) to authenticated;

-- ── 2. Datos generales de la auditoría ──
create table actividades_cambios (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividades(id) on delete cascade,
  anterior jsonb not null,
  nuevo jsonb not null,
  motivo text not null check (length(btrim(motivo)) >= 10),
  registrado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now()
);

create index actividades_cambios_actividad_idx on actividades_cambios (actividad_id);

alter table actividades_cambios enable row level security;
create policy actividades_cambios_select on actividades_cambios for select to authenticated
using (authz.puede_ver_actividad(actividad_id));
revoke insert, update, delete on actividades_cambios from anon, authenticated;

create or replace function proteger_datos_generales_actividad()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.dependencia_auditada, new.periodo_evaluado_inicio, new.periodo_evaluado_fin, new.auditor_principal_nit,
      new.fecha_inicio_plazo, new.fecha_notificacion, new.tipo_auditoria, new.departamento_id)
     is distinct from
     (old.dependencia_auditada, old.periodo_evaluado_inicio, old.periodo_evaluado_fin, old.auditor_principal_nit,
      old.fecha_inicio_plazo, old.fecha_notificacion, old.tipo_auditoria, old.departamento_id)
     and auth.uid() is not null
  then
    if new.tipo_auditoria is distinct from old.tipo_auditoria or new.departamento_id is distinct from old.departamento_id then
      raise exception 'El departamento y el tipo de auditoría no se cambian: de ellos depende la carpeta del expediente.';
    end if;
    if coalesce(current_setting('scidai.edicion_datos_auditoria', true), '') <> 'on' then
      raise exception 'Los datos generales de la auditoría solo los corrige la jefatura, indicando el motivo.';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function proteger_datos_generales_actividad() from public, anon, authenticated;

create trigger actividades_proteger_datos_generales
  before update on actividades
  for each row execute function proteger_datos_generales_actividad();

create or replace function editar_datos_auditoria(
  p_actividad_id uuid,
  p_dependencia text,
  p_periodo_inicio date,
  p_periodo_fin date,
  p_auditor_principal_nit text,
  p_fecha_inicio_plazo date,
  p_fecha_notificacion date,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_act actividades%rowtype;
  v_anterior jsonb;
  v_nuevo jsonb;
begin
  select * into v_act from actividades where id = p_actividad_id for update;
  if not found or not coalesce(authz.puede_operar_actividad(p_actividad_id), false) then
    raise exception 'No tiene acceso a esta auditoría.';
  end if;
  if not authz.es_jefatura_auditoria() then
    raise exception 'Corregir los datos de la auditoría es decisión de la jefatura (Subjefe, Jefe, Subdirector o Director).';
  end if;
  if v_act.concluida and coalesce(authz.permiso_actual() <> 'control_total', true) then
    raise exception 'La auditoría ya está concluida: solo Dirección puede corregir sus datos.';
  end if;
  if length(btrim(coalesce(p_dependencia, ''))) = 0 or p_periodo_inicio is null or p_periodo_fin is null
     or p_fecha_inicio_plazo is null or p_fecha_notificacion is null then
    raise exception 'Complete todos los datos de la auditoría.';
  end if;
  if p_periodo_fin < p_periodo_inicio then
    raise exception 'El fin del período evaluado no puede ser anterior a su inicio.';
  end if;
  if not exists (select 1 from usuarios u where u.nit = p_auditor_principal_nit and u.activo) then
    raise exception 'El auditor principal no existe o está inactivo.';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Escriba el motivo de la corrección (al menos 10 caracteres).';
  end if;

  v_anterior := jsonb_build_object(
    'dependencia_auditada', v_act.dependencia_auditada,
    'periodo_evaluado_inicio', v_act.periodo_evaluado_inicio,
    'periodo_evaluado_fin', v_act.periodo_evaluado_fin,
    'auditor_principal_nit', v_act.auditor_principal_nit,
    'fecha_inicio_plazo', v_act.fecha_inicio_plazo,
    'fecha_notificacion', v_act.fecha_notificacion);
  v_nuevo := jsonb_build_object(
    'dependencia_auditada', btrim(p_dependencia),
    'periodo_evaluado_inicio', p_periodo_inicio,
    'periodo_evaluado_fin', p_periodo_fin,
    'auditor_principal_nit', p_auditor_principal_nit,
    'fecha_inicio_plazo', p_fecha_inicio_plazo,
    'fecha_notificacion', p_fecha_notificacion);
  if v_anterior = v_nuevo then
    raise exception 'No cambió ningún dato.';
  end if;

  insert into actividades_cambios (actividad_id, anterior, nuevo, motivo, registrado_por_nit)
  values (p_actividad_id, v_anterior, v_nuevo, btrim(p_motivo), authz.nit_actual());

  perform set_config('scidai.edicion_datos_auditoria', 'on', true);
  update actividades
     set dependencia_auditada = btrim(p_dependencia),
         periodo_evaluado_inicio = p_periodo_inicio,
         periodo_evaluado_fin = p_periodo_fin,
         auditor_principal_nit = p_auditor_principal_nit,
         fecha_inicio_plazo = p_fecha_inicio_plazo,
         fecha_notificacion = p_fecha_notificacion
   where id = p_actividad_id;
  perform set_config('scidai.edicion_datos_auditoria', '', true);
end;
$$;

revoke execute on function editar_datos_auditoria(uuid, text, date, date, text, date, date, text) from public, anon;
grant execute on function editar_datos_auditoria(uuid, text, date, date, text, date, date, text) to authenticated;

-- ── 3. Cronograma obligatorio para cerrar Planificación ──
create or replace function exigir_cronograma_planificacion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.etapa_actual = 'planificacion' and new.etapa_actual is distinct from old.etapa_actual
     and auth.uid() is not null
     and not exists (select 1 from hitos_cronograma h where h.actividad_id = new.id) then
    raise exception 'Registre el cronograma de actividades (plazos SAG-UDAI-WEB) antes de cerrar la Planificación.';
  end if;
  return new;
end;
$$;

revoke execute on function exigir_cronograma_planificacion() from public, anon, authenticated;

create trigger actividades_exigir_cronograma
  before update of etapa_actual on actividades
  for each row execute function exigir_cronograma_planificacion();

-- ── 4. Cerrar etapa en un solo paso ──
-- SECURITY INVOKER: RLS de `actividades`, `hitos_cronograma` y el historial deciden quién puede;
-- los triggers de `actividades` validan documentos, equipo y cronograma. Si algo falla, nada queda
-- a medias (las actividades concluidas se revierten con el error).
create or replace function cerrar_etapa_actividad(p_actividad_id uuid)
returns etapa_actividad_enum
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actual etapa_actividad_enum;
  v_siguiente etapa_actividad_enum;
begin
  select etapa_actual into v_actual from actividades where id = p_actividad_id for update;
  if not found then
    raise exception 'No se encontró la auditoría.';
  end if;
  v_siguiente := case v_actual
    when 'planificacion' then 'ejecucion'
    when 'ejecucion' then 'comunicacion_resultados'
    when 'comunicacion_resultados' then 'expediente_cierre'
  end;
  if v_siguiente is null then
    raise exception 'La auditoría ya está en Expediente / Cierre.';
  end if;

  update hitos_cronograma
     set fecha_fin_real = authz.hoy_guatemala(), estado = 'concluido'
   where actividad_id = p_actividad_id
     and etapa::text = v_actual::text
     and fecha_fin_real is null;

  update actividades set etapa_actual = v_siguiente where id = p_actividad_id;
  if not found then
    raise exception 'Su cargo no tiene permiso para cerrar la etapa de esta auditoría.';
  end if;

  insert into actividades_etapa_historial (actividad_id, etapa_cerrada, etapa_siguiente, cerrado_por_nit)
  values (p_actividad_id, v_actual, v_siguiente, authz.nit_actual());

  return v_siguiente;
end;
$$;

revoke execute on function cerrar_etapa_actividad(uuid) from public, anon;
grant execute on function cerrar_etapa_actividad(uuid) to authenticated;
