-- Bug real encontrado en la prueba de integración de flujo completo (2026-09-03): el trigger
-- `validar_avance_etapa` (20260903000001) exige que "ningún integrante del equipo tenga
-- recibido/declaración sin confirmar", pero ese conteo se cumple de forma vacía cuando el
-- equipo está vacío — así que una actividad recién creada, SIN equipo, SIN documentos y SIN
-- hitos, podía cerrar Planificación con un solo clic. Confirmado en vivo contra la base local
-- (NAI-004-2026 avanzó a Ejecución sin nada capturado). Se agrega la condición que faltaba:
-- al menos un integrante de equipo debe existir, además de que ninguno tenga confirmaciones
-- pendientes.
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
  v_equipo_total integer;
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

  select count(*) into v_docs_pendientes
  from documentos_actividad da
  join documentos_catalogo dc on dc.id = da.documento_catalogo_id
  where da.actividad_id = old.id
    and dc.etapa::text = old.etapa_actual::text
    and da.fase_actual <> 'finalizado';

  if v_docs_pendientes > 0 then
    raise exception 'No se puede cerrar "%": todavía hay % documento(s) de esa etapa sin finalizar.', old.etapa_actual, v_docs_pendientes;
  end if;

  select count(*) into v_hitos_pendientes
  from hitos_cronograma h
  where h.actividad_id = old.id
    and h.etapa::text = old.etapa_actual::text
    and h.estado <> 'concluido';

  if v_hitos_pendientes > 0 then
    raise exception 'No se puede cerrar "%": todavía hay % hito(s) de cronograma de esa etapa sin concluir.', old.etapa_actual, v_hitos_pendientes;
  end if;

  if old.etapa_actual = 'planificacion' then
    select count(*) into v_equipo_total
    from actividades_equipo ae
    where ae.actividad_id = old.id;

    if v_equipo_total = 0 then
      raise exception 'No se puede cerrar Planificación: la actividad todavía no tiene ningún integrante de equipo asignado.';
    end if;

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
