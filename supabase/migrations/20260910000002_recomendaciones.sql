-- Módulo de seguimiento a recomendaciones (nuevo, urgente): registro y control de las
-- recomendaciones que emite cada informe de auditoría, hasta que quedan atendidas. Igual que
-- capacitaciones, es independiente del módulo de trazabilidad (en pausa por la reunión de
-- consenso del catálogo de 18 documentos — ver cuestionario-consenso-proceso.md): no referencia
-- `actividades`, aunque comparte su mismo patrón de equipo/RLS.
--
-- Modelo (basado en "Esquema para programa con comentarios.xlsx" y las notas en rojo del
-- revisor, resueltas así):
--   informes_auditoria -> deficiencias -> recomendaciones -> seguimientos_recomendacion
-- En vez de columnas fijas por "etapa" (1era/2da/3ra etapa del Excel), cada ronda de
-- seguimiento es una fila más en `seguimientos_recomendacion` — responde la nota roja de N20
-- ("cuántas etapas se van a trabajar") sin imponer un número fijo: se agrega la ronda que haga
-- falta hasta que la recomendación quede atendida.

create type estado_recomendacion_enum as enum ('pendiente', 'en_proceso', 'atendida');

-- Nota roja N4: el AÑO/FECHA del Excel reflejan cuándo se ejecutó la auditoría, no el período
-- auditado — se separan como columnas distintas (periodo_auditado_* vs. fecha/anio_ejecucion).
create table informes_auditoria (
  id uuid primary key default gen_random_uuid(),
  no_nombramiento text not null,
  cai text,
  departamento_id uuid not null references departamentos(id),
  dependencia_auditada text not null,
  periodo_auditado_inicio date not null,
  periodo_auditado_fin date not null,
  fecha date not null,
  anio_ejecucion integer generated always as (extract(year from fecha)::int) stored,
  fecha_informe_final date,
  supervisor_nit text references usuarios(nit),
  coordinador_nit text references usuarios(nit),
  riesgo text,
  creado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now(),
  check (periodo_auditado_fin >= periodo_auditado_inicio)
);

create table informes_auditoria_equipo (
  informe_id uuid not null references informes_auditoria(id) on delete cascade,
  usuario_nit text not null references usuarios(nit),
  primary key (informe_id, usuario_nit)
);

-- Nota roja N3: la deficiencia necesita descripción/título, no solo el número correlativo.
create table deficiencias (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null references informes_auditoria(id) on delete cascade,
  numero integer not null check (numero > 0),
  titulo text not null,
  descripcion text,
  creado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now(),
  unique (informe_id, numero)
);

-- Nota roja N5/N14: cada recomendación es su propia fila con su propio estado — nunca un texto
-- mixto como "2 atendidas 1 en proceso" (una deficiencia con 3 recomendaciones son 3 filas).
create table recomendaciones (
  id uuid primary key default gen_random_uuid(),
  deficiencia_id uuid not null references deficiencias(id) on delete cascade,
  numero integer not null check (numero > 0),
  texto text not null,
  fecha_implementacion date,
  -- Caché del estado más reciente (el de seguimientos_recomendacion.numero_seguimiento máximo):
  -- evita un subquery en cada listado/filtro de pendientes (nota roja N16) y lo mantiene el
  -- trigger recomendaciones_actualizar_estado más abajo.
  estado_actual estado_recomendacion_enum not null default 'pendiente',
  creado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now(),
  unique (deficiencia_id, numero)
);

create index recomendaciones_estado_actual_idx on recomendaciones(estado_actual);

-- Nota roja N15: el nombramiento origen queda trazable subiendo por esta cadena de FKs
-- (seguimiento -> recomendación -> deficiencia -> informe.no_nombramiento), sin duplicarlo en
-- cada fila. Append-only (sin grant de update/delete más abajo, mismo criterio que `movimientos`
-- y los "hechos consumados" de oficios): una captura errónea se corrige con una ronda nueva, no
-- editando ni borrando el historial de seguimiento.
create table seguimientos_recomendacion (
  id uuid primary key default gen_random_uuid(),
  recomendacion_id uuid not null references recomendaciones(id) on delete cascade,
  numero_seguimiento integer not null check (numero_seguimiento > 0),
  no_informe_seguimiento text not null,
  fecha date not null,
  estado estado_recomendacion_enum not null,
  comentario text,
  registrado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now(),
  unique (recomendacion_id, numero_seguimiento)
);

create index seguimientos_recomendacion_recomendacion_id_idx on seguimientos_recomendacion(recomendacion_id);

create or replace function recomendaciones_actualizar_estado()
returns trigger
language plpgsql
as $$
begin
  update recomendaciones set estado_actual = new.estado where id = new.recomendacion_id;
  return new;
end;
$$;

create trigger seguimientos_recomendacion_actualizar_estado
after insert on seguimientos_recomendacion
for each row execute function recomendaciones_actualizar_estado();

create index informes_auditoria_departamento_id_idx on informes_auditoria(departamento_id);
create index informes_auditoria_equipo_usuario_nit_idx on informes_auditoria_equipo(usuario_nit);
create index deficiencias_informe_id_idx on deficiencias(informe_id);
create index recomendaciones_deficiencia_id_idx on recomendaciones(deficiencia_id);

alter table informes_auditoria enable row level security;
alter table informes_auditoria_equipo enable row level security;
alter table deficiencias enable row level security;
alter table recomendaciones enable row level security;
alter table seguimientos_recomendacion enable row level security;

revoke all on informes_auditoria from anon, authenticated;
revoke all on informes_auditoria_equipo from anon, authenticated;
revoke all on deficiencias from anon, authenticated;
revoke all on recomendaciones from anon, authenticated;
revoke all on seguimientos_recomendacion from anon, authenticated;

-- Sin delete en informes_auditoria/deficiencias/recomendaciones: son el expediente de la
-- auditoría, mismo criterio que actividades (sección 6.5) — un error de captura se corrige con
-- update, nunca borrando la fila (rompería la trazabilidad de los seguimientos que dependen de
-- ella).
grant select, insert, update on informes_auditoria to authenticated;
grant select, insert, update, delete on informes_auditoria_equipo to authenticated;
grant select, insert, update on deficiencias to authenticated;
grant select, insert, update on recomendaciones to authenticated;
grant select, insert on seguimientos_recomendacion to authenticated;

-- ── authz: mismo patrón que authz.puede_ver_actividad/puede_operar_actividad ──

create or replace function authz.es_miembro_equipo_informe(p_informe_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from informes_auditoria_equipo ie
    where ie.informe_id = p_informe_id and ie.usuario_nit = authz.nit_actual()
  ) or exists (
    select 1 from informes_auditoria i
    where i.id = p_informe_id
      and (i.supervisor_nit = authz.nit_actual() or i.coordinador_nit = authz.nit_actual())
  );
$$;

-- Sección 8, mismo alcance que actividades: Auditor/Supervisor/Coordinador ven solo los
-- informes donde están asignados; Jefe/Subjefe los de su departamento; Subdirector los de su
-- subdirección; Director todos.
create or replace function authz.puede_ver_informe(p_informe_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    authz.es_director()
    or exists (
      select 1 from informes_auditoria i
      where i.id = p_informe_id
        and (
          (authz.cargo_actual() in ('jefe', 'subjefe') and i.departamento_id = authz.departamento_actual())
          or (
            authz.cargo_actual() = 'subdirector'
            and i.departamento_id in (
              select d.id from departamentos d where d.subdireccion_id = authz.subdireccion_actual()
            )
          )
          or authz.es_miembro_equipo_informe(i.id)
        )
    );
$$;

create or replace function authz.puede_operar_informe(p_informe_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select authz.puede_escribir() and authz.puede_ver_informe(p_informe_id);
$$;

grant execute on function authz.es_miembro_equipo_informe(uuid) to authenticated;
grant execute on function authz.puede_ver_informe(uuid) to authenticated;
grant execute on function authz.puede_operar_informe(uuid) to authenticated;

-- ── informes_auditoria ──

create policy informes_auditoria_select on informes_auditoria for select to authenticated
using (authz.puede_ver_informe(id));

-- El equipo (supervisor/coordinador/auditores) todavía no existe en el momento del insert, así
-- que crear un informe nuevo es función de jefatura, igual que actividades_insert.
create policy informes_auditoria_insert on informes_auditoria for insert to authenticated
with check (
  authz.puede_escribir()
  and (
    authz.es_director()
    or (authz.cargo_actual() in ('jefe', 'subjefe') and departamento_id = authz.departamento_actual())
    or (authz.cargo_actual() = 'subdirector' and departamento_id in (select authz.departamentos_visibles()))
  )
);

create policy informes_auditoria_update on informes_auditoria for update to authenticated
using (authz.puede_ver_informe(id))
with check (authz.puede_operar_informe(id));

-- ── informes_auditoria_equipo ──

create policy informes_auditoria_equipo_select on informes_auditoria_equipo for select to authenticated
using (authz.puede_ver_informe(informe_id));

create policy informes_auditoria_equipo_insert on informes_auditoria_equipo for insert to authenticated
with check (authz.puede_operar_informe(informe_id));

create policy informes_auditoria_equipo_update on informes_auditoria_equipo for update to authenticated
using (authz.puede_ver_informe(informe_id))
with check (authz.puede_operar_informe(informe_id));

create policy informes_auditoria_equipo_delete on informes_auditoria_equipo for delete to authenticated
using (authz.puede_operar_informe(informe_id));

-- ── deficiencias ──

create policy deficiencias_select on deficiencias for select to authenticated
using (authz.puede_ver_informe(informe_id));

create policy deficiencias_insert on deficiencias for insert to authenticated
with check (authz.puede_operar_informe(informe_id));

create policy deficiencias_update on deficiencias for update to authenticated
using (authz.puede_ver_informe(informe_id))
with check (authz.puede_operar_informe(informe_id));

-- ── recomendaciones ──

create policy recomendaciones_select on recomendaciones for select to authenticated
using (exists (select 1 from deficiencias d where d.id = deficiencia_id and authz.puede_ver_informe(d.informe_id)));

create policy recomendaciones_insert on recomendaciones for insert to authenticated
with check (exists (select 1 from deficiencias d where d.id = deficiencia_id and authz.puede_operar_informe(d.informe_id)));

create policy recomendaciones_update on recomendaciones for update to authenticated
using (exists (select 1 from deficiencias d where d.id = deficiencia_id and authz.puede_ver_informe(d.informe_id)))
with check (exists (select 1 from deficiencias d where d.id = deficiencia_id and authz.puede_operar_informe(d.informe_id)));

-- ── seguimientos_recomendacion ──

create policy seguimientos_recomendacion_select on seguimientos_recomendacion for select to authenticated
using (
  exists (
    select 1 from recomendaciones r
    join deficiencias d on d.id = r.deficiencia_id
    where r.id = recomendacion_id and authz.puede_ver_informe(d.informe_id)
  )
);

create policy seguimientos_recomendacion_insert on seguimientos_recomendacion for insert to authenticated
with check (
  registrado_por_nit = authz.nit_actual()
  and exists (
    select 1 from recomendaciones r
    join deficiencias d on d.id = r.deficiencia_id
    where r.id = recomendacion_id and authz.puede_operar_informe(d.informe_id)
  )
);
