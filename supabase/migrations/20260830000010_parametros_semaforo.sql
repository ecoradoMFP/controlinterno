create table parametros_semaforo (
  id uuid primary key default gen_random_uuid(),
  ambito ambito_semaforo_enum not null unique,
  umbral_verde_pct numeric(5,2) not null,
  umbral_amarillo_pct numeric(5,2) not null,
  umbral_naranja_pct numeric(5,2) not null,
  check (umbral_verde_pct > umbral_amarillo_pct and umbral_amarillo_pct > umbral_naranja_pct)
);

alter table parametros_semaforo enable row level security;

revoke all on parametros_semaforo from anon, authenticated;
grant select on parametros_semaforo to authenticated;
grant update on parametros_semaforo to authenticated;
