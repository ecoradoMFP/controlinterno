-- Prompt maestro, sección 4.8: bitácora inmutable del ciclo de revisión.
create table movimientos (
  id uuid primary key default gen_random_uuid(),
  documento_actividad_id uuid not null references documentos_actividad(id) on delete restrict,
  de_cargo cargo_enum,
  a_cargo cargo_enum not null,
  tipo_evento tipo_evento_movimiento_enum not null,
  "timestamp" timestamptz not null default now(),
  observacion text,
  registrado_por_nit text not null references usuarios(nit),
  es_correccion_direccion boolean not null default false,
  -- Sección 12.5: una corrección de Dirección nunca es silenciosa, siempre lleva justificación.
  check (not es_correccion_direccion or observacion is not null)
);

create index movimientos_documento_actividad_id_idx on movimientos(documento_actividad_id);
create index movimientos_timestamp_idx on movimientos("timestamp");
create index movimientos_registrado_por_nit_idx on movimientos(registrado_por_nit);

alter table movimientos enable row level security;

-- Sección 12.1: inmutabilidad reforzada a nivel de base de datos, no solo por convención de
-- la aplicación. Únicamente INSERT es posible.
revoke all on movimientos from anon, authenticated;
grant select, insert on movimientos to authenticated;

create or replace function bloquear_update_delete_movimientos()
returns trigger
language plpgsql
as $$
begin
  raise exception 'movimientos es una bitácora inmutable: % no está permitido (id=%)', tg_op, old.id;
end;
$$;

-- Defensa en profundidad: esta barrera aplica sin importar el rol de conexión (incluido uno
-- con privilegios elevados que se hubiera otorgado por error), porque no depende de RLS ni
-- de GRANT/REVOKE — dispara para cualquier UPDATE o DELETE sobre la tabla.
create trigger movimientos_sin_update
  before update on movimientos
  for each row execute function bloquear_update_delete_movimientos();

create trigger movimientos_sin_delete
  before delete on movimientos
  for each row execute function bloquear_update_delete_movimientos();
