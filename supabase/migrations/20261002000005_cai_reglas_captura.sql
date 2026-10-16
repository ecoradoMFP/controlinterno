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
