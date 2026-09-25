-- La cédula de un seguimiento se cierra al emitirse su informe u oficio (cuando tiene número):
-- el documento sale ya con el resultado de cada recomendación evaluada, así que después no se le
-- agregan evaluaciones. Sin esta regla, un documento ya emitido que cubre un informe aparecía
-- "en curso" para las recomendaciones de ese informe que no evaluó (p. ej. el oficio
-- DAI-DAF-14-2025 evaluó solo 2 de las 4 recomendaciones de NAI-031-2024).
--
-- Flujo resultante, igual para informe y oficio: nombramiento (o registro del oficio) ->
-- los auditores nombrados evalúan -> se registra la emisión (número y fecha) -> SAG-UDAI.

-- Un oficio (sin nombramiento) ya no tiene que traer su número desde el inicio: se registra al
-- emitirse, como el de un informe.
alter table documentos_seguimiento drop constraint documentos_seguimiento_check;

create or replace function seguimientos_recomendacion_asignar_numero()
returns trigger
language plpgsql
-- security definer: es contabilidad interna del ciclo. El auditor nombrado para el seguimiento
-- puede insertar la evaluación (policy seguimientos_recomendacion_insert) pero no editar la
-- recomendación, y este trigger necesita bloquearla/actualizar su estado_actual.
security definer
set search_path = public
as $$
declare
  v_estado estado_recomendacion_enum;
  v_ultimo integer;
begin
  -- Serializa inserciones concurrentes sobre la misma recomendación.
  select estado_actual into v_estado from recomendaciones where id = new.recomendacion_id for update;
  select max(numero_seguimiento) into v_ultimo from seguimientos_recomendacion where recomendacion_id = new.recomendacion_id;

  if v_ultimo is not null and v_estado = 'cumplida' then
    raise exception 'La recomendación ya está cumplida: su ciclo de seguimiento está cerrado';
  end if;

  if new.documento_id is not null and not exists (
    select 1 from documentos_seguimiento_informes dsi
    join deficiencias d on d.informe_id = dsi.informe_id
    join recomendaciones r on r.deficiencia_id = d.id
    where dsi.documento_id = new.documento_id and r.id = new.recomendacion_id
  ) then
    raise exception 'El nombramiento de seguimiento no cubre el informe de esta recomendación';
  end if;

  -- Cédula cerrada. Solo aplica a usuarios de la aplicación: las cargas históricas (service
  -- role, scripts/importar-matriz-recomendaciones.mjs) registran documentos ya emitidos. Se
  -- mira el rol del JWT y no current_user, que dentro de una función security definer es el
  -- dueño de la función.
  if new.documento_id is not null
     and coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
     and exists (select 1 from documentos_seguimiento where id = new.documento_id and no_documento is not null) then
    raise exception 'El informe u oficio de este seguimiento ya fue emitido: su cédula está cerrada';
  end if;

  if new.documento_id is null then
    if v_ultimo is not null then
      raise exception 'El estado al informe final solo puede registrarse antes de cualquier seguimiento';
    end if;
    new.numero_seguimiento := 0;
  else
    new.numero_seguimiento := coalesce(v_ultimo, 0) + 1;
  end if;
  return new;
end;
$$;

-- Mismo criterio (rol del JWT) para la protección de la carga al SAG-UDAI, en vez de
-- current_user: no depende de cómo se invoque el trigger.
create or replace function documentos_seguimiento_proteger_sag_udai()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.fecha_carga_sag_udai is distinct from old.fecha_carga_sag_udai
     and coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
     and not authz.es_director() then
    raise exception 'Solo el Director puede registrar la carga al SAG-UDAI';
  end if;
  return new;
end;
$$;
