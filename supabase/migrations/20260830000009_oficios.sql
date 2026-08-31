-- Prompt maestro, sección 4.10: correspondencia (oficios) con plazos de respuesta.
create table oficios (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid references actividades(id),
  no_oficio text not null unique check (no_oficio ~ '^DAI-[A-Z]{2,6}-\d{3}-\d{4}$'),
  fecha_emision date not null,
  destinatario text not null,
  puesto_destinatario text,
  asunto text not null,
  responsable_elaboracion_nit text not null references usuarios(nit),
  medio_envio text,
  fecha_envio date,
  fecha_recepcion date,
  plazo_respuesta_dias int check (plazo_respuesta_dias is null or plazo_respuesta_dias > 0),
  fecha_vencimiento date,
  no_respuesta text,
  fecha_respuesta date,
  observaciones text,
  created_at timestamptz not null default now()
);

create table oficios_revisores (
  oficio_id uuid not null references oficios(id) on delete cascade,
  usuario_nit text not null references usuarios(nit),
  primary key (oficio_id, usuario_nit)
);

create table oficios_firmantes (
  oficio_id uuid not null references oficios(id) on delete cascade,
  usuario_nit text not null references usuarios(nit),
  primary key (oficio_id, usuario_nit)
);

create index oficios_actividad_id_idx on oficios(actividad_id);
create index oficios_responsable_elaboracion_nit_idx on oficios(responsable_elaboracion_nit);
create index oficios_fecha_vencimiento_idx on oficios(fecha_vencimiento);

alter table oficios enable row level security;
alter table oficios_revisores enable row level security;
alter table oficios_firmantes enable row level security;

revoke all on oficios from anon, authenticated;
revoke all on oficios_revisores from anon, authenticated;
revoke all on oficios_firmantes from anon, authenticated;

-- Sin delete en oficios: la correspondencia ya emitida no se borra (mismo principio que
-- actividades/documentos_actividad).
grant select, insert, update on oficios to authenticated;
grant select, insert, update, delete on oficios_revisores to authenticated;
grant select, insert, update, delete on oficios_firmantes to authenticated;

-- Sección 12.1/12.5: fecha_envio, fecha_recepcion y fecha_respuesta documentan hechos ya
-- ocurridos. Una vez capturadas no se editan libremente; solo permiso_sistema='control_total'
-- puede corregirlas, y solo dejando constancia (el texto de `observaciones` debe cambiar
-- junto con el dato, nunca una corrección silenciosa).
create or replace function proteger_hechos_consumados_oficio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.fecha_envio is not null and new.fecha_envio is distinct from old.fecha_envio)
     or (old.fecha_recepcion is not null and new.fecha_recepcion is distinct from old.fecha_recepcion)
     or (old.fecha_respuesta is not null and new.fecha_respuesta is distinct from old.fecha_respuesta)
  then
    -- auth.uid() es null en conexiones sin contexto de usuario (migraciones, seed, scripts
    -- administrativos server-only de la sección 12.2): esas se consideran de confianza.
    if auth.uid() is not null then
      if not exists (
        select 1 from usuarios u
        where u.auth_user_id = auth.uid() and u.permiso_sistema = 'control_total'
      ) then
        raise exception 'fecha_envio/fecha_recepcion/fecha_respuesta ya registradas: solo control_total puede corregirlas';
      end if;

      if new.observaciones is not distinct from old.observaciones then
        raise exception 'toda corrección de una fecha ya registrada debe documentarse en observaciones';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger oficios_proteger_hechos_consumados
  before update on oficios
  for each row execute function proteger_hechos_consumados_oficio();
