create table calendario_feriados (
  fecha date primary key,
  descripcion text not null
);

alter table calendario_feriados enable row level security;

revoke all on calendario_feriados from anon, authenticated;
grant select on calendario_feriados to authenticated;
grant insert, update, delete on calendario_feriados to authenticated;
