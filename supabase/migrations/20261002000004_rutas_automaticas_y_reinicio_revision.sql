-- 1. Rutas del expediente digital automáticas, por correlativo.
--    Escribirlas a mano genera inconsistencias; las asigna la base al crear cada registro:
--      Auditoría  → Auditorias/<año>/<sigla depto>/<tipo de auditoría>/<NNN>
--                   (NNN = correlativo por año + departamento + tipo)
--      Documento  → <ruta de la auditoría>/<NN> <nombre del paso>   (NN = orden 1-18 del catálogo)
--      Oficio     → Oficios/<año>/<sigla del número>/<no. de oficio>
--    Nadie con sesión de usuario puede cambiarlas después.
-- 2. Devolución para corrección: al volver a entregarse, la revisión reinicia desde el primer
--    revisor (Auditor → Subjefe → Jefe, según la matriz del documento), sin saltar al cargo que
--    devolvió.

-- ── 1. Rutas ──
alter table departamentos add column sigla text unique;
update departamentos set sigla = case
  when nombre ilike '%financier%' then 'DAF'
  when nombre ilike '%administrativ%' then 'DAAP'
  when nombre ilike '%especial%' then 'DAE'
end;

create table correlativos_ruta (
  clave text primary key,
  ultimo integer not null default 0
);
alter table correlativos_ruta enable row level security;  -- sin policies ni grants: solo las funciones de abajo

create or replace function ruta_segmento(p text)
returns text
language sql immutable
set search_path = public
as $$
  select btrim(regexp_replace(regexp_replace(coalesce(p, ''), '[\\/:*?"<>|]', '', 'g'), '\s+', ' ', 'g'));
$$;

create or replace function actividades_asignar_ruta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sigla text;
  v_anio text := to_char(coalesce(new.fecha_emision_nombramiento, new.fecha_inicio_plazo), 'YYYY');
  -- Primera letra en mayúscula y el resto en minúscula: "Financiera", "FINANCIERA " y "financiera"
  -- caen en la misma carpeta y el mismo correlativo.
  v_tipo text := coalesce(nullif(ruta_segmento(new.tipo_auditoria), ''), 'Sin tipo');
  v_n integer;
begin
  v_tipo := upper(left(v_tipo, 1)) || lower(substr(v_tipo, 2));
  select coalesce(sigla, 'GEN') into v_sigla from departamentos where id = new.departamento_id;
  insert into correlativos_ruta (clave, ultimo)
  values ('aud|' || v_anio || '|' || v_sigla || '|' || lower(v_tipo), 1)
  on conflict (clave) do update set ultimo = correlativos_ruta.ultimo + 1
  returning ultimo into v_n;
  new.ruta_expediente := format('Auditorias/%s/%s/%s/%s', v_anio, v_sigla, v_tipo, lpad(v_n::text, 3, '0'));
  return new;
end;
$$;

create or replace function documentos_asignar_ruta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ruta text;
  v_orden integer;
  v_nombre text;
  v_genera boolean;
begin
  select a.ruta_expediente, dc.orden, dc.nombre, dc.genera_documento
  into v_ruta, v_orden, v_nombre, v_genera
  from actividades a, documentos_catalogo dc
  where a.id = new.actividad_id and dc.id = new.documento_catalogo_id;

  new.ruta_archivo := case when v_genera and v_ruta is not null
    then v_ruta || '/' || lpad(v_orden::text, 2, '0') || ' ' || ruta_segmento(v_nombre) end;
  return new;
end;
$$;

create or replace function oficios_asignar_ruta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.ruta_archivo := format('Oficios/%s/%s/%s', to_char(new.fecha_emision, 'YYYY'), split_part(new.no_oficio, '-', 2), new.no_oficio);
  return new;
end;
$$;

-- Las rutas son del sistema: con sesión de usuario no se modifican (scripts y migraciones, sin
-- auth.uid(), sí pueden, p. ej. si se mueve el expediente a otro servidor y hay que reescribirlas).
create or replace function proteger_ruta_automatica()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- to_jsonb: el mismo trigger sirve a tablas con columnas distintas (new.<campo> inexistente falla).
  if auth.uid() is not null then
    if tg_table_name = 'actividades'
       and to_jsonb(new)->>'ruta_expediente' is distinct from to_jsonb(old)->>'ruta_expediente' then
      raise exception 'La ruta del expediente la asigna el sistema y no se puede modificar.';
    elsif tg_table_name in ('documentos_actividad', 'oficios')
       and to_jsonb(new)->>'ruta_archivo' is distinct from to_jsonb(old)->>'ruta_archivo' then
      raise exception 'La ruta del archivo la asigna el sistema y no se puede modificar.';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function actividades_asignar_ruta() from public, anon, authenticated;
revoke execute on function documentos_asignar_ruta() from public, anon, authenticated;
revoke execute on function oficios_asignar_ruta() from public, anon, authenticated;
revoke execute on function proteger_ruta_automatica() from public, anon, authenticated;

create trigger actividades_asignar_ruta before insert on actividades
  for each row execute function actividades_asignar_ruta();
create trigger documentos_actividad_asignar_ruta before insert on documentos_actividad
  for each row execute function documentos_asignar_ruta();
create trigger oficios_asignar_ruta before insert on oficios
  for each row execute function oficios_asignar_ruta();
create trigger actividades_proteger_ruta before update on actividades
  for each row execute function proteger_ruta_automatica();
create trigger documentos_actividad_proteger_ruta before update on documentos_actividad
  for each row execute function proteger_ruta_automatica();
create trigger oficios_proteger_ruta before update on oficios
  for each row execute function proteger_ruta_automatica();

-- ── 2. Corrección: la revisión reinicia ──
create or replace function avanzar_documento(
  p_documento_id uuid,
  p_accion text,
  p_observacion text default null,
  p_fase_esperada fase_documento_enum default null,
  p_responsable_esperado cargo_enum default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_doc documentos_actividad%rowtype;
  v_departamento uuid;
  v_cadena cargo_enum[];
  v_pos integer;
  v_destino cargo_enum;
  v_nueva_fase fase_documento_enum;
  v_tipo tipo_evento_movimiento_enum;
  v_cargo_usuario cargo_enum := authz.cargo_actual();
  v_permiso permiso_sistema_enum := authz.permiso_actual();
  v_obs text := nullif(btrim(coalesce(p_observacion, '')), '');
begin
  select da.* into v_doc from documentos_actividad da where da.id = p_documento_id for update;
  if not found then
    raise exception 'No se encontró el documento o no tienes acceso a él.';
  end if;

  if (p_fase_esperada is not null and p_fase_esperada <> v_doc.fase_actual)
     or (p_responsable_esperado is not null and p_responsable_esperado <> v_doc.cargo_actual_responsable)
  then
    raise exception 'El documento cambió mientras lo veías (alguien más registró un paso). Recarga la página.';
  end if;

  select a.departamento_id into v_departamento from actividades a where a.id = v_doc.actividad_id;

  select array_agg(r.cargo order by r.orden_revision) into v_cadena
  from documentos_catalogo_revision r
  where r.documento_catalogo_id = v_doc.documento_catalogo_id and r.departamento_id = v_departamento;

  if v_cadena is null or array_length(v_cadena, 1) < 2 then
    raise exception 'Este documento no tiene revisores definidos en la matriz de revisión de su departamento.';
  end if;

  if p_accion = 'visto_bueno' then
    if v_cargo_usuario is null or v_cargo_usuario not in ('subdirector', 'director') then
      raise exception 'El visto bueno fuera de la matriz es exclusivo de Subdirección y Dirección.';
    end if;
    insert into movimientos (documento_actividad_id, de_cargo, a_cargo, tipo_evento, observacion, registrado_por_nit)
    values (p_documento_id, v_cargo_usuario, v_doc.cargo_actual_responsable, 'aprobacion',
            coalesce(v_obs, 'Visto bueno'), authz.nit_actual());
    return;
  end if;

  if v_doc.fase_actual = 'finalizado' then
    raise exception 'El documento ya está finalizado.';
  end if;

  if p_accion = 'entregar' then
    if v_doc.fase_actual not in ('elaboracion', 'correccion') then
      raise exception 'El documento ya está en revisión: lo aprueba o devuelve el revisor actual.';
    end if;
    if v_permiso not in ('control_total', 'captura_delegada')
       and v_cargo_usuario is distinct from v_doc.cargo_actual_responsable
    then
      raise exception 'La entrega la registra % (quien tiene el documento).', v_doc.cargo_actual_responsable;
    end if;

    -- Toda entrega (primera o posterior a una corrección) reinicia la revisión desde el primer
    -- revisor de la cadena de la matriz: Auditor → Subjefe → Jefe, según corresponda al documento.
    v_destino := v_cadena[2];
    v_tipo := 'entrega';
    v_nueva_fase := 'revision';

  elsif p_accion in ('aprobar', 'devolver') then
    if v_doc.fase_actual <> 'revision' then
      raise exception 'El documento no está en revisión.';
    end if;

    if p_accion = 'aprobar' then
      if v_permiso is distinct from 'control_total' and v_cargo_usuario is distinct from v_doc.cargo_actual_responsable then
        raise exception 'Solo % puede aprobar el documento en este paso.', v_doc.cargo_actual_responsable;
      end if;

      v_pos := array_position(v_cadena, v_doc.cargo_actual_responsable);
      if v_pos is null then
        raise exception 'El responsable actual no figura en la matriz de revisión de este documento.';
      end if;

      v_tipo := 'aprobacion';
      if v_pos < array_length(v_cadena, 1) then
        v_destino := v_cadena[v_pos + 1];
        v_nueva_fase := 'revision';
      else
        v_destino := v_doc.cargo_actual_responsable;
        v_nueva_fase := 'finalizado';
      end if;
    else
      if v_permiso not in ('control_total', 'captura_delegada')
         and v_cargo_usuario is distinct from v_doc.cargo_actual_responsable
      then
        raise exception 'Solo % puede devolver el documento en este paso.', v_doc.cargo_actual_responsable;
      end if;
      if v_obs is null then
        raise exception 'Indica en la observación qué debe corregirse.';
      end if;
      v_tipo := 'devolucion_correccion';
      v_destino := v_cadena[1];
      v_nueva_fase := 'correccion';
    end if;

  else
    raise exception 'Acción desconocida: %', p_accion;
  end if;

  insert into movimientos (documento_actividad_id, de_cargo, a_cargo, tipo_evento, observacion, registrado_por_nit)
  values (p_documento_id, v_doc.cargo_actual_responsable, v_destino, v_tipo, v_obs, authz.nit_actual());

  perform set_config('scidai.avance_guiado', 'on', true);
  update documentos_actividad
  set fase_actual = v_nueva_fase, cargo_actual_responsable = v_destino
  where id = p_documento_id;
  perform set_config('scidai.avance_guiado', 'off', true);
end;
$$;

revoke execute on function avanzar_documento(uuid, text, text, fase_documento_enum, cargo_enum) from public, anon;
grant execute on function avanzar_documento(uuid, text, text, fase_documento_enum, cargo_enum) to authenticated;
