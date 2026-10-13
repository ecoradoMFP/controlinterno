-- Respuestas de las jefaturas (cuestionario, 2026-10-13):
--
-- A1. Los cargos temporales también los registran el Jefe y el Subjefe, solo para su propio
--     departamento y nunca para sí mismos (Director y Subdirector, para cualquiera).
-- B1. El nombramiento de seguimiento lleva coordinador siempre, en todos los departamentos.
-- Además, los mensajes del sistema se dirigen al usuario de "usted".

-- ── A1. Cargos temporales: también Jefe y Subjefe, en su departamento ──
-- Se decide con el cargo y departamento REALES (no los de un cargo temporal vigente), para que un
-- cargo temporal no sirva para registrar otro.
drop policy cargos_temporales_insert on cargos_temporales;
drop policy cargos_temporales_update on cargos_temporales;
drop function authz.puede_registrar_cargo_temporal();

create or replace function authz.puede_registrar_cargo_temporal(p_departamento_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(authz.puede_escribir(), false)
     and exists (
       select 1 from usuarios u
       where u.auth_user_id = auth.uid()
         and u.activo
         and (u.cargo in ('director', 'subdirector')
              or (u.cargo in ('jefe', 'subjefe') and u.departamento_id = p_departamento_id))
     );
$$;

revoke execute on function authz.puede_registrar_cargo_temporal(uuid) from public, anon;
grant execute on function authz.puede_registrar_cargo_temporal(uuid) to authenticated;

create policy cargos_temporales_insert on cargos_temporales for insert to authenticated
with check (
  authz.puede_registrar_cargo_temporal(departamento_id)
  and registrado_por_nit = authz.nit_actual()
  and usuario_nit <> authz.nit_actual()
);

create policy cargos_temporales_update on cargos_temporales for update to authenticated
using (authz.puede_registrar_cargo_temporal(departamento_id))
with check (authz.puede_registrar_cargo_temporal(departamento_id) and revocado_por_nit = authz.nit_actual());

-- ── B1. Coordinador obligatorio en todo nombramiento de seguimiento ──
-- Con trigger y no con CHECK: los nombramientos ya cargados sin coordinador (Especiales) deben
-- poder seguir emitiéndose y cargándose al SAG-UDAI sin que se les exija hasta que se complete.
create or replace function documentos_seguimiento_exigir_coordinador()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tipo_documento <> 'oficio' and new.coordinador_nit is null
     and (tg_op = 'INSERT' or old.coordinador_nit is not null) then
    raise exception 'Indique el coordinador del nombramiento de seguimiento.';
  end if;
  return new;
end;
$$;

revoke execute on function documentos_seguimiento_exigir_coordinador() from public, anon, authenticated;

create trigger documentos_seguimiento_exigir_coordinador
  before insert or update of coordinador_nit, tipo_documento on documentos_seguimiento
  for each row execute function documentos_seguimiento_exigir_coordinador();

-- ── Mensajes de "usted" en marcar_no_aplica (las demás funciones se corrigieron en sus
-- migraciones, que todavía no estaban en línea) ──

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
    raise exception 'No tiene permiso de escritura.';
  end if;

  if v_justificacion is null or length(v_justificacion) < 10 then
    raise exception 'Escriba la justificación (al menos 10 caracteres).';
  end if;

  select da.* into v_doc from documentos_actividad da where da.id = p_documento_id for update;
  if not found then
    raise exception 'No se encontró el documento o no tiene acceso a él.';
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
