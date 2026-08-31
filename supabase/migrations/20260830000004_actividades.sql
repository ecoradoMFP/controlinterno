-- Prompt maestro, sección 4.4: actividades (auditorías) y su equipo asignado.
create table actividades (
  id uuid primary key default gen_random_uuid(),
  no_nombramiento text not null unique check (no_nombramiento ~ '^NAI-\d{3}-\d{4}$'),
  departamento_id uuid not null references departamentos(id),
  auditor_principal_nit text not null references usuarios(nit),
  dependencia_auditada text not null,
  tipo_auditoria text not null,
  periodo_evaluado_inicio date not null,
  periodo_evaluado_fin date not null,
  fecha_inicio_plazo date not null,
  fecha_notificacion date not null,
  etapa_actual etapa_actividad_enum not null default 'planificacion',
  expedientes_relacionados text[] not null default '{}',
  created_at timestamptz not null default now(),
  check (periodo_evaluado_fin >= periodo_evaluado_inicio),
  check (fecha_notificacion >= fecha_inicio_plazo)
);

create table actividades_equipo (
  actividad_id uuid not null references actividades(id) on delete cascade,
  usuario_nit text not null references usuarios(nit),
  rol_en_equipo text,
  primary key (actividad_id, usuario_nit)
);

create index actividades_departamento_id_idx on actividades(departamento_id);
create index actividades_auditor_principal_nit_idx on actividades(auditor_principal_nit);
create index actividades_equipo_usuario_nit_idx on actividades_equipo(usuario_nit);

alter table actividades enable row level security;
alter table actividades_equipo enable row level security;

revoke all on actividades from anon, authenticated;
revoke all on actividades_equipo from anon, authenticated;

-- Sin grant de delete en actividades: una auditoría abierta no se borra (sección 6.5); un
-- error de captura se corrige con un movimiento nuevo, nunca eliminando el expediente.
grant select, insert, update on actividades to authenticated;
grant select, insert, update, delete on actividades_equipo to authenticated;
