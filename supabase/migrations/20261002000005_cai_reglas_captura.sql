-- Reglas de captura del seguimiento a recomendaciones, ahora exigidas también por la base:
--  * El módulo da seguimiento solo a CAI, y todo CAI lleva su nombramiento: ambos son
--    obligatorios, con la fecha de nombramiento y el tipo de auditoría.
--  * Toda recomendación lleva fecha de implementación.
--  * Una deficiencia tiene UNA sola recomendación (las anuladas ya no cuentan).
-- Las restricciones son NOT VALID: rigen para todo insert/update nuevo, pero no reprueban las
-- filas históricas que ya existían (p. ej. datos cargados de las matrices antes de esta regla).

alter table informes_auditoria drop constraint informes_auditoria_identificacion;
alter table informes_auditoria add constraint informes_auditoria_cai_completo
  check (
    nullif(btrim(no_nombramiento), '') is not null
    and nullif(btrim(cai), '') is not null
    and fecha_nombramiento is not null
    and nullif(btrim(tipo_auditoria), '') is not null
  ) not valid;

alter table recomendaciones add constraint recomendaciones_fecha_implementacion_requerida
  check (fecha_implementacion is not null) not valid;

create or replace function recomendaciones_una_por_deficiencia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Bloquea la deficiencia para que dos altas simultáneas no se salten la regla.
  perform 1 from deficiencias where id = new.deficiencia_id for update;
  if new.anulada_en is null and exists (
    select 1 from recomendaciones r
    where r.deficiencia_id = new.deficiencia_id and r.anulada_en is null and r.id <> new.id
  ) then
    raise exception 'Cada deficiencia tiene una sola recomendación';
  end if;
  return new;
end;
$$;

create trigger recomendaciones_una_por_deficiencia
before insert on recomendaciones
for each row execute function recomendaciones_una_por_deficiencia();

revoke execute on function public.recomendaciones_una_por_deficiencia() from public, anon, authenticated;
