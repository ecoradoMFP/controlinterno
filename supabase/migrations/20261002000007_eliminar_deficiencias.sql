-- "Eliminar" una deficiencia (captura por error) SIN perder trazabilidad, igual que una
-- recomendación: anulación lógica (anulada_en), motivo obligatorio y bitácora append-only escrita
-- por el trigger. Al eliminarla también se eliminan sus recomendaciones, cada una con su propia
-- entrada en la bitácora. Solo se puede mientras ninguna recomendación suya tenga seguimientos
-- evaluados y el CAI no esté bloqueado.

alter table deficiencias add column anulada_en timestamptz;

-- Una deficiencia anulada libera su número dentro del informe.
alter table deficiencias drop constraint deficiencias_informe_id_numero_key;
create unique index deficiencias_informe_numero_vigente_idx
  on deficiencias (informe_id, numero) where anulada_en is null;

alter table deficiencias_historial
  add column accion text not null default 'editada' check (accion in ('editada', 'anulada'));
alter table deficiencias_historial alter column datos_nuevos drop not null;

-- Las deficiencias anuladas no se ven ni se editan.
drop policy deficiencias_select on deficiencias;
create policy deficiencias_select on deficiencias for select to authenticated
using (anulada_en is null and authz.puede_ver_informe(informe_id));

drop policy deficiencias_update on deficiencias;
create policy deficiencias_update on deficiencias for update to authenticated
using (anulada_en is null and authz.puede_ver_informe(informe_id))
with check (authz.puede_operar_informe(informe_id));

create or replace function deficiencias_registrar_cambio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anula boolean;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;

  if new.numero is distinct from old.numero or new.informe_id is distinct from old.informe_id then
    raise exception 'No se puede cambiar el número ni el informe de una deficiencia';
  end if;
  if old.anulada_en is not null and new.anulada_en is distinct from old.anulada_en then
    raise exception 'Una deficiencia eliminada no se puede restaurar';
  end if;

  v_anula := new.anulada_en is not null and old.anulada_en is null;

  if not (v_anula or new.titulo is distinct from old.titulo or new.descripcion is distinct from old.descripcion) then
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
    raise exception 'La deficiencia ya tiene seguimientos evaluados: no se puede editar ni eliminar';
  end if;

  if v_anula then
    new.anulada_en := now();
  end if;

  insert into deficiencias_historial (deficiencia_id, informe_id, accion, datos_anteriores, datos_nuevos, motivo, usuario_nit)
  values (
    old.id, old.informe_id,
    case when v_anula then 'anulada' else 'editada' end,
    jsonb_build_object('numero', old.numero, 'titulo', old.titulo, 'descripcion', old.descripcion),
    case when v_anula then null
         else jsonb_build_object('numero', new.numero, 'titulo', new.titulo, 'descripcion', new.descripcion) end,
    btrim(new.motivo_ultimo_cambio),
    authz.nit_actual()
  );

  new.motivo_ultimo_cambio := null;
  return new;
end;
$$;

-- Anular no puede ser un UPDATE directo (la fila anulada deja de cumplir la policy de select).
-- Esta función valida el permiso, elimina las recomendaciones de la deficiencia (el trigger de
-- cada una exige el motivo, rechaza si hay seguimientos y escribe su bitácora) y luego la
-- deficiencia, todo en una sola transacción.
create or replace function anular_deficiencia(p_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_informe uuid;
  v_numero integer;
begin
  select informe_id, numero into v_informe, v_numero from deficiencias where id = p_id and anulada_en is null;

  if v_informe is null or not authz.puede_operar_informe(v_informe) then
    raise exception 'No tienes permiso para eliminar esta deficiencia';
  end if;

  update recomendaciones
  set anulada_en = now(), motivo_ultimo_cambio = 'Se eliminó la deficiencia ' || v_numero || ': ' || p_motivo
  where deficiencia_id = p_id and anulada_en is null;

  update deficiencias set anulada_en = now(), motivo_ultimo_cambio = p_motivo where id = p_id;
end;
$$;

revoke execute on function anular_deficiencia(uuid, text) from public, anon;
grant execute on function anular_deficiencia(uuid, text) to authenticated;
