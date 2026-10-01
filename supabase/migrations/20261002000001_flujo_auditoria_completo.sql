-- Completa el flujo de auditorías (CAI) según la validación de 2026-10-01
-- (`analisis-matrices-scidai.md`, secciones 6-8):
--
-- 1. El número de nombramiento deja de exigir el formato `NAI-000-AAAA`. La DAI confirmó que los
--    formatos no siempre son los mismos (ej. `DAI-DAF-SR-CAI-01-2026`); la validación de formato
--    queda para después, en un solo punto de la app (`src/lib/validations/formatos.ts`).
-- 2. Fechas del Registro Auxiliar de Nombramientos y cierre del expediente: la auditoría concluye
--    con la entrega del expediente al archivo.
-- 3. Flujo de revisión guiado por la matriz `documentos_catalogo_revision`, en una sola
--    transacción (`avanzar_documento`), en vez de que el usuario elija a mano cargos y fase.
-- 4. Vínculo auditoría → informe del inventario de recomendaciones.
-- 5. Rutas del expediente digital (futuro NAS/servidor de la DTI): se guarda la ruta RELATIVA a
--    la carpeta raíz de expedientes; la raíz se configura fuera de la base
--    (`SCIDAI_RUTA_BASE_EXPEDIENTES`), así mudar los archivos de servidor no obliga a reescribir
--    ninguna fila.

-- ── 1. Número de nombramiento abierto ──
alter table actividades drop constraint actividades_no_nombramiento_check;
alter table actividades add constraint actividades_no_nombramiento_no_vacio
  check (length(btrim(no_nombramiento)) > 0);

-- ── 5. Rutas relativas del expediente digital ──
-- Relativa a la raíz de expedientes: sin unidad (C:), sin UNC (\\servidor), sin raíz (/), sin
-- segmentos `..` que se salgan de la carpeta. Se guarda con `/` como separador.
create or replace function ruta_expediente_valida(p_ruta text)
returns boolean
language sql immutable
set search_path = public
as $$
  select p_ruta is null or (
    length(p_ruta) between 1 and 500
    and p_ruta !~ '^[/\\]'
    and p_ruta !~ '^[A-Za-z]:'
    and p_ruta !~ '\\'
    and p_ruta !~ '(^|/)\.\.(/|$)'
  );
$$;

alter table actividades add column ruta_expediente text
  constraint actividades_ruta_expediente_valida check (ruta_expediente_valida(ruta_expediente));
alter table documentos_actividad add column ruta_archivo text
  constraint documentos_actividad_ruta_archivo_valida check (ruta_expediente_valida(ruta_archivo));
alter table oficios add column ruta_archivo text
  constraint oficios_ruta_archivo_valida check (ruta_expediente_valida(ruta_archivo));
alter table informes_auditoria add column ruta_archivo text
  constraint informes_auditoria_ruta_archivo_valida check (ruta_expediente_valida(ruta_archivo));
alter table documentos_seguimiento add column ruta_archivo text
  constraint documentos_seguimiento_ruta_archivo_valida check (ruta_expediente_valida(ruta_archivo));

-- ── 2. Fechas del nombramiento y cierre del expediente ──
-- `fecha_notificacion` (ya existente) sigue siendo la fecha LÍMITE del nombramiento (plazo);
-- `fecha_notificacion_informe` es la notificación REAL del informe a la dependencia.
alter table actividades
  add column fecha_emision_nombramiento date,
  add column fecha_notificacion_equipo date,
  add column fecha_notificacion_dependencia date,
  add column area text,
  add column fecha_notificacion_informe date,
  add column fecha_notificacion_cgc date,
  add column fecha_entrega_archivo date,
  add column observaciones text,
  add column concluida boolean generated always as (fecha_entrega_archivo is not null) stored;

alter table actividades add constraint actividades_cgc_despues_de_informe
  check (fecha_notificacion_cgc is null or (fecha_notificacion_informe is not null and fecha_notificacion_cgc >= fecha_notificacion_informe));
alter table actividades add constraint actividades_archivo_despues_de_informe
  check (fecha_entrega_archivo is null or (fecha_notificacion_informe is not null and fecha_entrega_archivo >= fecha_notificacion_informe));
alter table actividades add constraint actividades_notificaciones_despues_de_emision
  check (
    fecha_emision_nombramiento is null
    or ((fecha_notificacion_equipo is null or fecha_notificacion_equipo >= fecha_emision_nombramiento)
        and (fecha_notificacion_dependencia is null or fecha_notificacion_dependencia >= fecha_emision_nombramiento))
  );

create index actividades_concluida_idx on actividades(concluida);

-- Las fechas de cierre solo se registran con el expediente ya en Expediente/Cierre, y una vez
-- capturadas son hechos consumados: mismo criterio que `proteger_hechos_consumados_oficio`
-- (solo control_total las corrige, y dejando constancia en `observaciones`).
create or replace function proteger_cierre_expediente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.fecha_notificacion_informe is distinct from old.fecha_notificacion_informe
      or new.fecha_notificacion_cgc is distinct from old.fecha_notificacion_cgc
      or new.fecha_entrega_archivo is distinct from old.fecha_entrega_archivo)
     and new.etapa_actual <> 'expediente_cierre'
  then
    raise exception 'Las fechas de cierre (notificación del informe, notificación a la CGC y entrega al archivo) se registran cuando la auditoría está en Expediente/Cierre.';
  end if;

  if (old.fecha_notificacion_informe is not null and new.fecha_notificacion_informe is distinct from old.fecha_notificacion_informe)
     or (old.fecha_notificacion_cgc is not null and new.fecha_notificacion_cgc is distinct from old.fecha_notificacion_cgc)
     or (old.fecha_entrega_archivo is not null and new.fecha_entrega_archivo is distinct from old.fecha_entrega_archivo)
  then
    -- auth.uid() null = conexión sin usuario (migraciones, seed, scripts server-only).
    if auth.uid() is not null then
      if coalesce(authz.permiso_actual() <> 'control_total', true) then
        raise exception 'Fecha de cierre ya registrada: solo control_total puede corregirla.';
      end if;
      if new.observaciones is not distinct from old.observaciones then
        raise exception 'Toda corrección de una fecha de cierre ya registrada debe documentarse en observaciones.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function proteger_cierre_expediente() from public, anon, authenticated;

create trigger actividades_proteger_cierre_expediente
  before update on actividades
  for each row execute function proteger_cierre_expediente();

-- ── 3. Flujo de revisión guiado ──
-- La fase y el responsable de un documento solo cambian por `avanzar_documento` (o por
-- control_total, o por conexiones sin usuario). La bitácora `movimientos` y el estado del
-- documento se escriben en la misma transacción, así ya no puede quedar uno sin el otro.
create or replace function proteger_fase_documento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.fase_actual is distinct from old.fase_actual
      or new.cargo_actual_responsable is distinct from old.cargo_actual_responsable)
     and auth.uid() is not null
     and coalesce(current_setting('scidai.avance_guiado', true), '') <> 'on'
     and coalesce(authz.permiso_actual() <> 'control_total', true)
  then
    raise exception 'La fase del documento solo avanza con las acciones del flujo de revisión (entregar, aprobar, devolver).';
  end if;
  return new;
end;
$$;

revoke execute on function proteger_fase_documento() from public, anon, authenticated;

create trigger documentos_actividad_proteger_fase
  before update on documentos_actividad
  for each row execute function proteger_fase_documento();

-- Acciones:
--   'entregar'    elaboración/corrección → revisión. La primera entrega va al primer revisor de
--                 la matriz; después de una corrección vuelve al cargo que la devolvió
--                 (así lo mide la matriz "Control Auxiliar deficiencia CC"). La registra quien
--                 tiene el documento (normalmente el Auditor), captura_delegada o control_total.
--   'aprobar'     el revisor actual aprueba: pasa al siguiente cargo de la matriz, o finaliza el
--                 documento si era el último. Solo el propio cargo (o control_total); nunca
--                 captura_delegada (sección 12.5, reforzado también por RLS de movimientos).
--   'devolver'    el revisor actual devuelve para corrección, siempre al Auditor (regla acordada
--                 2026-09-18). Observación obligatoria.
--   'visto_bueno' Subdirector/Director dejan constancia aunque su cargo no esté en la matriz del
--                 documento; no cambia fase ni responsable.
-- SECURITY INVOKER: RLS de `documentos_actividad` y `movimientos` sigue decidiendo quién opera.
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

    v_destino := null;
    if v_doc.fase_actual = 'correccion' then
      select m.de_cargo into v_destino
      from movimientos m
      where m.documento_actividad_id = p_documento_id and m.tipo_evento = 'devolucion_correccion'
      order by m."timestamp" desc
      limit 1;
      if v_destino is not null and not (v_destino = any (v_cadena[2:])) then
        v_destino := null;
      end if;
    end if;
    v_destino := coalesce(v_destino, v_cadena[2]);
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

-- ── 4. Auditoría → inventario de recomendaciones ──
alter table informes_auditoria add column actividad_id uuid unique references actividades(id);

-- ── 6. Documentos de cada etapa: automáticos y obligatorios ──
-- La matriz "REVISIONES POR DOCUMENTO" (control de documentos en la realización de auditorías
-- CAI) lista los 18 pasos de las 3 etapas. Al abrirse una etapa se crean sus documentos
-- (responsable inicial: el primer cargo de la matriz), y la etapa no se cierra hasta que todos
-- estén finalizados — antes solo se validaban los que alguien había iniciado a mano.
--
-- Algunos pasos son actividades que no generan un documento como tal: `genera_documento =
-- false` los distingue en pantalla (no se les pide ruta de archivo), pero siguen pasando por la
-- revisión que marca la matriz. Cuáles son lo confirma la DAI; por defecto todos generan.
alter table documentos_catalogo add column genera_documento boolean not null default true;

create or replace function crear_documentos_etapa(p_actividad_id uuid, p_etapa etapa_actividad_enum)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into documentos_actividad (actividad_id, documento_catalogo_id, cargo_actual_responsable)
  select a.id, dc.id, coalesce(
    (select r.cargo from documentos_catalogo_revision r
     where r.documento_catalogo_id = dc.id and r.departamento_id = a.departamento_id
     order by r.orden_revision limit 1),
    'auditor')
  from actividades a
  join documentos_catalogo dc on dc.etapa::text = p_etapa::text
  where a.id = p_actividad_id
  on conflict (actividad_id, documento_catalogo_id) do nothing;
end;
$$;

revoke execute on function crear_documentos_etapa(uuid, etapa_actividad_enum) from public, anon, authenticated;

create or replace function actividades_crear_documentos_etapa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.etapa_actual is distinct from old.etapa_actual then
    perform crear_documentos_etapa(new.id, new.etapa_actual);
  end if;
  return null;
end;
$$;

revoke execute on function actividades_crear_documentos_etapa() from public, anon, authenticated;

create trigger actividades_crear_documentos_etapa
  after insert or update of etapa_actual on actividades
  for each row execute function actividades_crear_documentos_etapa();

create or replace function exigir_documentos_etapa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faltantes text;
begin
  if new.etapa_actual is not distinct from old.etapa_actual then
    return new;
  end if;

  select string_agg(dc.orden || '. ' || dc.nombre, '; ' order by dc.orden) into v_faltantes
  from documentos_catalogo dc
  where dc.etapa::text = old.etapa_actual::text
    and not exists (
      select 1 from documentos_actividad da
      where da.actividad_id = old.id and da.documento_catalogo_id = dc.id and da.fase_actual = 'finalizado'
    );

  if v_faltantes is not null then
    raise exception 'No se puede cerrar la etapa: faltan por finalizar %', v_faltantes;
  end if;

  return new;
end;
$$;

revoke execute on function exigir_documentos_etapa() from public, anon, authenticated;

create trigger actividades_exigir_documentos_etapa
  before update of etapa_actual on actividades
  for each row execute function exigir_documentos_etapa();

-- Auditorías ya abiertas: se completan los documentos de su etapa actual que nadie había iniciado.
select crear_documentos_etapa(a.id, a.etapa_actual)
from actividades a
where a.etapa_actual <> 'expediente_cierre';
