-- Flujograma institucional real (Auditoría Interna, DAI): una auditoría avanza por 4 etapas
-- fijas y no puede saltarse ni retroceder — Planificación → Ejecución → Comunicación de
-- Resultados → Expediente/Cierre (archivo). `actividades.etapa_actual` existía desde el
-- inicio pero nada en el sistema lo movía nunca. Esta migración agrega el mecanismo real de
-- cierre de etapa, reforzado en la base de datos (no solo en la Server Action), mismo
-- principio de defensa en profundidad que 12.1/12.3.

-- El primer paso del proceso real, antes de cualquier trabajo de gabinete, es que el equipo
-- firme de recibido el nombramiento y su Declaración de Independencia. Se exige como
-- condición para cerrar Planificación (más abajo) — no para crear la actividad ni para
-- agregar miembros — para no bloquear el alta del expediente mientras se recopilan firmas.
alter table actividades_equipo
  add column fecha_recibido date,
  add column fecha_declaracion_independencia date;

create or replace function validar_avance_etapa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_siguiente etapa_actividad_enum;
  v_docs_pendientes integer;
  v_hitos_pendientes integer;
  v_equipo_incompleto integer;
begin
  if new.etapa_actual = old.etapa_actual then
    return new;
  end if;

  v_siguiente := case old.etapa_actual
    when 'planificacion' then 'ejecucion'
    when 'ejecucion' then 'comunicacion_resultados'
    when 'comunicacion_resultados' then 'expediente_cierre'
    else null
  end;

  if v_siguiente is null then
    raise exception 'El expediente ya está en Expediente/Cierre — no hay una etapa siguiente a la cual avanzar.';
  end if;

  if new.etapa_actual <> v_siguiente then
    raise exception 'No se puede pasar de "%" a "%": el proceso avanza una sola etapa a la vez, en orden (Planificación → Ejecución → Comunicación de Resultados → Expediente/Cierre).', old.etapa_actual, new.etapa_actual;
  end if;

  -- No se cierra una etapa con documentos de esa etapa todavía sin finalizar.
  select count(*) into v_docs_pendientes
  from documentos_actividad da
  join documentos_catalogo dc on dc.id = da.documento_catalogo_id
  where da.actividad_id = old.id
    and dc.etapa::text = old.etapa_actual::text
    and da.fase_actual <> 'finalizado';

  if v_docs_pendientes > 0 then
    raise exception 'No se puede cerrar "%": todavía hay % documento(s) de esa etapa sin finalizar.', old.etapa_actual, v_docs_pendientes;
  end if;

  -- Ni con hitos de cronograma de esa etapa todavía sin concluir.
  select count(*) into v_hitos_pendientes
  from hitos_cronograma h
  where h.actividad_id = old.id
    and h.etapa::text = old.etapa_actual::text
    and h.estado <> 'concluido';

  if v_hitos_pendientes > 0 then
    raise exception 'No se puede cerrar "%": todavía hay % hito(s) de cronograma de esa etapa sin concluir.', old.etapa_actual, v_hitos_pendientes;
  end if;

  -- Planificación exige además que todo el equipo haya confirmado recibido del nombramiento
  -- y su Declaración de Independencia.
  if old.etapa_actual = 'planificacion' then
    select count(*) into v_equipo_incompleto
    from actividades_equipo ae
    where ae.actividad_id = old.id
      and (ae.fecha_recibido is null or ae.fecha_declaracion_independencia is null);

    if v_equipo_incompleto > 0 then
      raise exception 'No se puede cerrar Planificación: % integrante(s) del equipo todavía no confirma recibido del nombramiento o su Declaración de Independencia.', v_equipo_incompleto;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function validar_avance_etapa() from public, anon, authenticated;

-- Defensa en profundidad: dispara sin importar el rol de conexión, igual que la inmutabilidad
-- de `movimientos` — un UPDATE directo (incluso administrativo) también queda sujeto a la regla.
create trigger actividades_validar_avance_etapa
  before update on actividades
  for each row execute function validar_avance_etapa();

-- Tampoco se puede empezar a elaborar un documento de una etapa que todavía no arrancó (ej.
-- iniciar un documento de Ejecución mientras la actividad sigue en Planificación).
drop policy if exists documentos_actividad_insert on documentos_actividad;
create policy documentos_actividad_insert on documentos_actividad for insert to authenticated
with check (
  authz.puede_operar_actividad(actividad_id)
  and exists (
    select 1
    from actividades a
    join documentos_catalogo dc on dc.id = documento_catalogo_id
    where a.id = actividad_id
      and dc.etapa::text = a.etapa_actual::text
  )
);

-- Bitácora de cierres de etapa (misma filosofía de inmutabilidad que `movimientos`, a nivel
-- de actividad en vez de documento): deja constancia de quién cerró cada etapa y cuándo,
-- visible como evidencia en el detalle de la actividad.
create table actividades_etapa_historial (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividades(id) on delete cascade,
  etapa_cerrada etapa_actividad_enum not null,
  etapa_siguiente etapa_actividad_enum not null,
  cerrado_por_nit text not null references usuarios(nit),
  "timestamp" timestamptz not null default now()
);

create index actividades_etapa_historial_actividad_id_idx on actividades_etapa_historial(actividad_id);

alter table actividades_etapa_historial enable row level security;

revoke all on actividades_etapa_historial from anon, authenticated;
grant select, insert on actividades_etapa_historial to authenticated;

-- Reutiliza la misma función bloqueadora que `movimientos` (genérica: solo usa old.id).
create trigger actividades_etapa_historial_sin_update
  before update on actividades_etapa_historial
  for each row execute function bloquear_update_delete_movimientos();

create trigger actividades_etapa_historial_sin_delete
  before delete on actividades_etapa_historial
  for each row execute function bloquear_update_delete_movimientos();

create policy actividades_etapa_historial_select on actividades_etapa_historial for select to authenticated
using (authz.puede_ver_actividad(actividad_id));

create policy actividades_etapa_historial_insert on actividades_etapa_historial for insert to authenticated
with check (
  authz.puede_operar_actividad(actividad_id)
  and cerrado_por_nit = authz.nit_actual()
);
