-- La auditoría se identifica por su CAI (jefaturas, 2026-10-12): número + año, igual que en el
-- seguimiento a recomendaciones (`informes_auditoria.cai/anio_cai`), porque el número se reinicia
-- cada año. Se pide al registrar una auditoría nueva; las ya registradas lo pueden tener vacío
-- (por eso se exige con trigger al insertar y no con un CHECK, que también frenaría sus UPDATE).
alter table actividades
  add column cai text check (cai is null or length(btrim(cai)) between 1 and 20),
  add column anio_cai smallint check (anio_cai is null or anio_cai between 2000 and 2100);

create unique index actividades_cai_anio_idx on actividades (cai, anio_cai)
  where cai is not null and anio_cai is not null;

create or replace function actividades_exigir_cai()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(new.cai, '')), '') is null or new.anio_cai is null then
    raise exception 'Indique el CAI de la auditoría (número y año).';
  end if;
  new.cai := btrim(new.cai);
  return new;
end;
$$;

revoke execute on function actividades_exigir_cai() from public, anon, authenticated;

create trigger actividades_exigir_cai
  before insert on actividades
  for each row execute function actividades_exigir_cai();

-- Una vez registrado, el CAI no cambia con la sesión de un usuario (es el identificador).
create or replace function actividades_proteger_cai()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null
     and old.cai is not null
     and (new.cai is distinct from old.cai or new.anio_cai is distinct from old.anio_cai) then
    raise exception 'El CAI de la auditoría no se puede cambiar.';
  end if;
  return new;
end;
$$;

revoke execute on function actividades_proteger_cai() from public, anon, authenticated;

create trigger actividades_proteger_cai
  before update on actividades
  for each row execute function actividades_proteger_cai();
