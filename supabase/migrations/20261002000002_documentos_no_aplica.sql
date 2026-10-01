-- "No aplica" para documentos del catálogo, y pasos que no generan documento.
--
-- 1. Un documento de la etapa puede marcarse "No aplica" con justificación obligatoria. Lo decide
--    la jefatura (Subjefe, Jefe, Subdirector o Director) o control_total. Cuenta como resuelto
--    para cerrar la etapa (queda en fase `finalizado` con `no_aplica = true`) y deja constancia en
--    la bitácora. Se puede revertir con motivo mientras la etapa siga abierta.
-- 2. Conocimiento y Comprensión del Área (2) y Gestión de Áreas (7) quedan como actividades sin
--    documento (decisión provisional de 2026-10-02, pendiente de confirmar con las jefaturas).

alter table documentos_actividad
  add column no_aplica boolean not null default false,
  add column no_aplica_justificacion text,
  add column no_aplica_por_nit text references usuarios(nit),
  add column no_aplica_fecha timestamptz,
  add constraint documentos_actividad_no_aplica_coherente check (
    not no_aplica
    or (fase_actual = 'finalizado' and length(btrim(coalesce(no_aplica_justificacion, ''))) > 0
        and no_aplica_por_nit is not null and no_aplica_fecha is not null)
  );

update documentos_catalogo set genera_documento = false where orden in (2, 7);

-- El trigger que protege la fase también protege la marca "No aplica": solo cambia por
-- `marcar_no_aplica` (o control_total, o conexiones sin usuario).
create or replace function proteger_fase_documento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.fase_actual is distinct from old.fase_actual
      or new.cargo_actual_responsable is distinct from old.cargo_actual_responsable
      or new.no_aplica is distinct from old.no_aplica
      or new.no_aplica_justificacion is distinct from old.no_aplica_justificacion)
     and auth.uid() is not null
     and coalesce(current_setting('scidai.avance_guiado', true), '') <> 'on'
     and coalesce(authz.permiso_actual() <> 'control_total', true)
  then
    raise exception 'La fase del documento solo avanza con las acciones del flujo de revisión (entregar, aprobar, devolver, no aplica).';
  end if;
  return new;
end;
$$;

revoke execute on function proteger_fase_documento() from public, anon, authenticated;

-- SECURITY INVOKER: RLS de `documentos_actividad` y `movimientos` sigue decidiendo quién opera.
create or replace function marcar_no_aplica(
  p_documento_id uuid,
  p_justificacion text,
  p_revertir boolean default false
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_doc documentos_actividad%rowtype;
  v_etapa_doc etapa_documento_enum;
  v_etapa_actividad etapa_actividad_enum;
  v_departamento uuid;
  v_primer_cargo cargo_enum;
  v_cargo_usuario cargo_enum := authz.cargo_actual();
  v_justificacion text := nullif(btrim(coalesce(p_justificacion, '')), '');
begin
  if coalesce(authz.permiso_actual() <> 'control_total', true)
     and (v_cargo_usuario is null or v_cargo_usuario not in ('subjefe', 'jefe', 'subdirector', 'director'))
  then
    raise exception 'Marcar un documento como "No aplica" es decisión de la jefatura (Subjefe, Jefe, Subdirector o Director).';
  end if;
  if not coalesce(authz.puede_escribir(), false) then
    raise exception 'No tienes permiso de escritura.';
  end if;

  if v_justificacion is null or length(v_justificacion) < 10 then
    raise exception 'Escribe la justificación (al menos 10 caracteres).';
  end if;

  select da.* into v_doc from documentos_actividad da where da.id = p_documento_id for update;
  if not found then
    raise exception 'No se encontró el documento o no tienes acceso a él.';
  end if;

  select dc.etapa, a.etapa_actual, a.departamento_id into v_etapa_doc, v_etapa_actividad, v_departamento
  from documentos_catalogo dc, actividades a
  where dc.id = v_doc.documento_catalogo_id and a.id = v_doc.actividad_id;

  if v_etapa_doc::text <> v_etapa_actividad::text then
    raise exception 'Solo se puede cambiar "No aplica" en documentos de la etapa en curso.';
  end if;

  if not p_revertir then
    if v_doc.fase_actual = 'finalizado' then
      raise exception 'El documento ya está finalizado.';
    end if;

    insert into movimientos (documento_actividad_id, de_cargo, a_cargo, tipo_evento, observacion, registrado_por_nit)
    values (p_documento_id, coalesce(v_cargo_usuario, v_doc.cargo_actual_responsable), v_doc.cargo_actual_responsable,
            'aprobacion', 'No aplica: ' || v_justificacion, authz.nit_actual());

    perform set_config('scidai.avance_guiado', 'on', true);
    update documentos_actividad
    set fase_actual = 'finalizado', no_aplica = true, no_aplica_justificacion = v_justificacion,
        no_aplica_por_nit = authz.nit_actual(), no_aplica_fecha = now()
    where id = p_documento_id;
    perform set_config('scidai.avance_guiado', 'off', true);
  else
    if not v_doc.no_aplica then
      raise exception 'El documento no está marcado como "No aplica".';
    end if;

    select r.cargo into v_primer_cargo
    from documentos_catalogo_revision r
    where r.documento_catalogo_id = v_doc.documento_catalogo_id and r.departamento_id = v_departamento
    order by r.orden_revision
    limit 1;
    v_primer_cargo := coalesce(v_primer_cargo, 'auditor');

    insert into movimientos (documento_actividad_id, de_cargo, a_cargo, tipo_evento, observacion, registrado_por_nit)
    values (p_documento_id, coalesce(v_cargo_usuario, v_doc.cargo_actual_responsable), v_primer_cargo,
            'devolucion_correccion', 'Se revierte "No aplica": ' || v_justificacion, authz.nit_actual());

    perform set_config('scidai.avance_guiado', 'on', true);
    update documentos_actividad
    set fase_actual = 'elaboracion', cargo_actual_responsable = v_primer_cargo, no_aplica = false,
        no_aplica_justificacion = null, no_aplica_por_nit = null, no_aplica_fecha = null
    where id = p_documento_id;
    perform set_config('scidai.avance_guiado', 'off', true);
  end if;
end;
$$;

revoke execute on function marcar_no_aplica(uuid, text, boolean) from public, anon;
grant execute on function marcar_no_aplica(uuid, text, boolean) to authenticated;
