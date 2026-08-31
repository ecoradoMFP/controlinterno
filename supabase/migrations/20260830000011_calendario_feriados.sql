-- Prompt maestro, sección 4.12: calendario de feriados/asuetos para el cálculo de días hábiles.
create table calendario_feriados (
  fecha date primary key,
  descripcion text not null
);

alter table calendario_feriados enable row level security;

revoke all on calendario_feriados from anon, authenticated;
grant select on calendario_feriados to authenticated;
-- insert/update/delete restringidos a control_total vía RLS en 20260830000013_rls_policies.sql
-- (Dirección mantiene el calendario).
grant insert, update, delete on calendario_feriados to authenticated;
