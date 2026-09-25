-- Ajuste del módulo de recomendaciones al flujo real, validado con la jefatura de la Dirección
-- de Auditorías Financieras a partir de tres fuentes (gitignored / fuera del repo):
--   - "DATOS DAF. PARA CARGAR EN EL SISTEMA.xlsx": matriz por etapas (informe final ->
--     seguimiento no. 1 -> seguimiento no. 2).
--   - "INFORME Y CÉDULA DE SEGUIMIENTO ... DAI-DAF-SR-CAI-04-2026": un informe de seguimiento
--     real con su cédula anexa.
--   - "SEGUIMIENTO INFORMES DE CAI.xlsx" (Anexo 4 de Auditorías Administrativas y de Procesos).
--
-- Lo que cambia respecto del modelo inicial (20260910000002):
--   * El eje es la RECOMENDACIÓN, no el informe: cada una tiene su propio ciclo de seguimiento,
--     que se repite hasta que queda "Cumplida" — ahí se cierra y ya no admite más seguimientos.
--   * Cada seguimiento nace de un NOMBRAMIENTO de seguimiento que emite la jefatura: nombra a
--     uno o varios auditores y cubre uno o varios CAI/informes. El resultado es un DOCUMENTO —
--     normalmente un "Informe de Actividad Administrativa" (p. ej. nombramiento
--     DAI-DAF-SR-CAI-06-2026 -> informe DAI-DAF-SR-CAI-04-2026), excepcionalmente un oficio
--     (plazo corto, mismo año) — cuyo número se registra al emitirse. Se emite siempre (aunque
--     nada quede cumplido) y se carga al SAG-UDAI web; esa carga solo la registra el Director.
--     Estar nombrado da permiso al auditor para registrar el seguimiento de las recomendaciones
--     de los informes cubiertos, aunque no haya sido parte del equipo de la auditoría original.
--     -> documentos_seguimiento (+ _auditores, + _informes); seguimientos_recomendacion pasa a
--        ser la evaluación de UNA recomendación en UN documento (estado + acciones de los
--        responsables + comentario de auditoría).
--   * Cuatro estados del Manual de Auditoría Interna Gubernamental: Cumplida, No cumplida,
--     En proceso, Pendiente.
--   * El informe de auditoría se identifica por nombramiento y/o CAI (Administrativas solo usa
--     el CAI), trae tipo de auditoría y fecha de notificación; el período auditado es opcional
--     (la matriz de DAF no lo trae).

-- ── estados ──

-- "Atendida" pasa a "Cumplida" (misma semántica). "No cumplida" sigue abierta a nuevos seguimientos:
-- solo "cumplida" cierra la recomendación.
alter type estado_recomendacion_enum rename value 'atendida' to 'cumplida';
alter type estado_recomendacion_enum add value 'no_cumplida' after 'en_proceso';

create type tipo_documento_seguimiento_enum as enum ('informe', 'oficio');

-- ── informes_auditoria ──

-- La columna D de la matriz de DAF es la fecha del nombramiento (de ella sale el AÑO).
alter table informes_auditoria rename column fecha to fecha_nombramiento;

-- Administrativas identifica cada auditoría solo por su CAI; DAF por nombramiento y CAI.
alter table informes_auditoria alter column no_nombramiento drop not null;
alter table informes_auditoria alter column fecha_nombramiento drop not null;
alter table informes_auditoria add constraint informes_auditoria_identificacion
  check (no_nombramiento is not null or cai is not null);

alter table informes_auditoria alter column periodo_auditado_inicio drop not null;
alter table informes_auditoria alter column periodo_auditado_fin drop not null;
alter table informes_auditoria add constraint informes_auditoria_periodo_completo
  check ((periodo_auditado_inicio is null) = (periodo_auditado_fin is null));

-- "Auditoría de Cumplimiento y Financiera", "Operativa"... (texto libre: cada departamento usa
-- su propia nomenclatura). La fecha de notificación encabeza la cédula ("notificado el 20 de
-- mayo de 2024").
alter table informes_auditoria add column tipo_auditoria text;
alter table informes_auditoria add column fecha_notificacion date;

-- ── recomendaciones ──

-- Columna "Responsable de implementar la recomendación" de la cédula: varias personas con su
-- puesto, fuera del sistema (personal de la dependencia auditada), así que es texto.
alter table recomendaciones add column responsables text;

-- ── documentos_seguimiento: nombramiento de seguimiento y el informe/oficio que resulta ──

create table documentos_seguimiento (
  id uuid primary key default gen_random_uuid(),
  -- Departamento que emite el nombramiento: define quién lo gestiona (RLS).
  departamento_id uuid not null references departamentos(id),
  tipo_documento tipo_documento_seguimiento_enum not null default 'informe',
  -- Un oficio no lleva nombramiento. Nulos permitidos para cargas históricas desde matrices que
  -- no lo registran; la captura en la interfaz lo exige para tipo 'informe'.
  no_nombramiento text,
  fecha_nombramiento date,
  -- Número y fecha del informe/oficio: se registran cuando se emite (el nombramiento va antes).
  no_documento text unique,
  fecha_documento date,
  fecha_carga_sag_udai date,
  creado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now(),
  check (no_documento is not null or no_nombramiento is not null),
  check (fecha_carga_sag_udai is null or no_documento is not null)
);

create index documentos_seguimiento_departamento_id_idx on documentos_seguimiento(departamento_id);

-- Auditor(es) nombrado(s) para dar el seguimiento.
create table documentos_seguimiento_auditores (
  documento_id uuid not null references documentos_seguimiento(id) on delete cascade,
  usuario_nit text not null references usuarios(nit),
  primary key (documento_id, usuario_nit)
);

create index documentos_seguimiento_auditores_usuario_nit_idx on documentos_seguimiento_auditores(usuario_nit);

-- CAI/informes que cubre el nombramiento (uno o varios).
create table documentos_seguimiento_informes (
  documento_id uuid not null references documentos_seguimiento(id) on delete cascade,
  informe_id uuid not null references informes_auditoria(id),
  primary key (documento_id, informe_id)
);

create index documentos_seguimiento_informes_informe_id_idx on documentos_seguimiento_informes(informe_id);

-- ── seguimientos_recomendacion: evaluación de una recomendación en un documento ──

-- El documento y su fecha viven en documentos_seguimiento. documento_id nulo = estado de la
-- recomendación al informe final (numero_seguimiento 0, 1ra etapa de la matriz de DAF: p. ej.
-- "En proceso" sin documento de seguimiento todavía).
alter table seguimientos_recomendacion drop column no_informe_seguimiento;
alter table seguimientos_recomendacion drop column fecha;
alter table seguimientos_recomendacion add column documento_id uuid references documentos_seguimiento(id);
alter table seguimientos_recomendacion rename column comentario to comentario_auditoria;
alter table seguimientos_recomendacion add column acciones_responsables text;

alter table seguimientos_recomendacion drop constraint seguimientos_recomendacion_numero_seguimiento_check;
alter table seguimientos_recomendacion add constraint seguimientos_recomendacion_numero_seguimiento_check
  check (numero_seguimiento >= 0);
alter table seguimientos_recomendacion add constraint seguimientos_recomendacion_documento_coherente
  check ((documento_id is null) = (numero_seguimiento = 0));
alter table seguimientos_recomendacion add constraint seguimientos_recomendacion_un_documento_una_vez
  unique (recomendacion_id, documento_id);

create index seguimientos_recomendacion_documento_id_idx on seguimientos_recomendacion(documento_id);

-- numero_seguimiento es el correlativo DENTRO del ciclo de cada recomendación (seguimiento no. 1,
-- 2, ... de esa recomendación) y lo asigna este trigger, no el cliente. Además hace cumplir el
-- ciclo: el estado al informe final solo puede ser la primera fila, y una recomendación ya
-- cumplida no admite más seguimientos; y el documento debe cubrir el informe de la
-- recomendación.
create or replace function seguimientos_recomendacion_asignar_numero()
returns trigger
language plpgsql
-- security definer: es contabilidad interna del ciclo. El auditor nombrado para el seguimiento
-- puede insertar la evaluación (policy seguimientos_recomendacion_insert) pero no editar la
-- recomendación, y este trigger necesita bloquearla/actualizar su estado_actual.
security definer
set search_path = public
as $$
declare
  v_estado estado_recomendacion_enum;
  v_ultimo integer;
begin
  -- Serializa inserciones concurrentes sobre la misma recomendación.
  select estado_actual into v_estado from recomendaciones where id = new.recomendacion_id for update;
  select max(numero_seguimiento) into v_ultimo from seguimientos_recomendacion where recomendacion_id = new.recomendacion_id;

  if v_ultimo is not null and v_estado = 'cumplida' then
    raise exception 'La recomendación ya está cumplida: su ciclo de seguimiento está cerrado';
  end if;

  if new.documento_id is not null and not exists (
    select 1 from documentos_seguimiento_informes dsi
    join deficiencias d on d.informe_id = dsi.informe_id
    join recomendaciones r on r.deficiencia_id = d.id
    where dsi.documento_id = new.documento_id and r.id = new.recomendacion_id
  ) then
    raise exception 'El nombramiento de seguimiento no cubre el informe de esta recomendación';
  end if;

  if new.documento_id is null then
    if v_ultimo is not null then
      raise exception 'El estado al informe final solo puede registrarse antes de cualquier seguimiento';
    end if;
    new.numero_seguimiento := 0;
  else
    new.numero_seguimiento := coalesce(v_ultimo, 0) + 1;
  end if;
  return new;
end;
$$;

create trigger seguimientos_recomendacion_asignar_numero
before insert on seguimientos_recomendacion
for each row execute function seguimientos_recomendacion_asignar_numero();

-- Manda el seguimiento más reciente del ciclo.
create or replace function recomendaciones_actualizar_estado()
returns trigger
language plpgsql
-- security definer: es contabilidad interna del ciclo. El auditor nombrado para el seguimiento
-- puede insertar la evaluación (policy seguimientos_recomendacion_insert) pero no editar la
-- recomendación, y este trigger necesita bloquearla/actualizar su estado_actual.
security definer
set search_path = public
as $$
begin
  update recomendaciones r
  set estado_actual = (
    select s.estado from seguimientos_recomendacion s
    where s.recomendacion_id = r.id
    order by s.numero_seguimiento desc
    limit 1
  )
  where r.id = new.recomendacion_id;
  return new;
end;
$$;

-- ── permisos ──

-- ¿El usuario actual está nombrado para dar seguimiento a este informe?
create or replace function authz.es_auditor_seguimiento_informe(p_informe_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from documentos_seguimiento_informes dsi
    join documentos_seguimiento_auditores dsa on dsa.documento_id = dsi.documento_id
    where dsi.informe_id = p_informe_id and dsa.usuario_nit = authz.nit_actual()
  );
$$;

-- Mismo alcance que antes (20260910000002) más el auditor nombrado para el seguimiento, que
-- necesita ver el informe y sus recomendaciones para evaluarlas.
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
    )
    or authz.es_auditor_seguimiento_informe(p_informe_id);
$$;

-- puede_operar_informe (editar el informe, sus deficiencias, recomendaciones y equipo) NO se
-- amplía: el auditor de seguimiento solo registra seguimientos, no modifica la auditoría
-- original. Por eso se redefine con el alcance original, sin pasar por puede_ver_informe.
create or replace function authz.puede_operar_informe(p_informe_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select authz.puede_escribir() and (
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
    )
  );
$$;

-- Registrar el seguimiento de una recomendación: el equipo/jefatura del informe o el auditor
-- nombrado para seguirlo.
create or replace function authz.puede_dar_seguimiento(p_informe_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select authz.puede_operar_informe(p_informe_id)
    or (authz.puede_escribir() and authz.es_auditor_seguimiento_informe(p_informe_id));
$$;

-- Emitir nombramientos de seguimiento es función de jefatura (lista blanca explícita de cargos).
create or replace function authz.puede_nombrar_seguimiento(p_departamento_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select authz.puede_escribir() and (
    authz.es_director()
    or (authz.cargo_actual() in ('jefe', 'subjefe') and p_departamento_id = authz.departamento_actual())
    or (authz.cargo_actual() = 'subdirector' and p_departamento_id in (select authz.departamentos_visibles()))
  );
$$;

create or replace function authz.es_auditor_documento(p_documento_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from documentos_seguimiento_auditores
    where documento_id = p_documento_id and usuario_nit = authz.nit_actual()
  );
$$;

create or replace function authz.puede_ver_documento_seguimiento(p_documento_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from documentos_seguimiento ds
    where ds.id = p_documento_id
      and (
        authz.es_director()
        or ds.departamento_id = authz.departamento_actual()
        or (authz.cargo_actual() = 'subdirector' and ds.departamento_id in (select authz.departamentos_visibles()))
        or authz.es_auditor_documento(ds.id)
        or exists (
          select 1 from documentos_seguimiento_informes dsi
          where dsi.documento_id = ds.id and authz.puede_ver_informe(dsi.informe_id)
        )
      )
  );
$$;

-- Registrar el número/fecha del informe u oficio cuando se emite: la jefatura que nombró o los
-- auditores nombrados.
create or replace function authz.puede_gestionar_documento(p_documento_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from documentos_seguimiento ds
    where ds.id = p_documento_id
      and (
        authz.puede_nombrar_seguimiento(ds.departamento_id)
        or (authz.puede_escribir() and authz.es_auditor_documento(ds.id))
      )
  );
$$;

grant execute on function authz.es_auditor_seguimiento_informe(uuid) to authenticated;
grant execute on function authz.puede_dar_seguimiento(uuid) to authenticated;
grant execute on function authz.puede_nombrar_seguimiento(uuid) to authenticated;
grant execute on function authz.es_auditor_documento(uuid) to authenticated;
grant execute on function authz.puede_ver_documento_seguimiento(uuid) to authenticated;
grant execute on function authz.puede_gestionar_documento(uuid) to authenticated;

alter table documentos_seguimiento enable row level security;
alter table documentos_seguimiento_auditores enable row level security;
alter table documentos_seguimiento_informes enable row level security;
revoke all on documentos_seguimiento from anon, authenticated;
revoke all on documentos_seguimiento_auditores from anon, authenticated;
revoke all on documentos_seguimiento_informes from anon, authenticated;

-- Sin delete: es un documento oficial. Después de crearse solo cambian el número/fecha del
-- informe u oficio (al emitirse) y la fecha de carga al SAG-UDAI (solo el Director, ver trigger).
grant select, insert on documentos_seguimiento to authenticated;
grant update (no_documento, fecha_documento, fecha_carga_sag_udai) on documentos_seguimiento to authenticated;
grant select, insert on documentos_seguimiento_auditores to authenticated;
grant select, insert on documentos_seguimiento_informes to authenticated;

create policy documentos_seguimiento_select on documentos_seguimiento for select to authenticated
using (authz.puede_ver_documento_seguimiento(id));

create policy documentos_seguimiento_insert on documentos_seguimiento for insert to authenticated
with check (creado_por_nit = authz.nit_actual() and authz.puede_nombrar_seguimiento(departamento_id));

create policy documentos_seguimiento_update on documentos_seguimiento for update to authenticated
using (authz.puede_gestionar_documento(id) or authz.es_director())
with check (authz.puede_gestionar_documento(id) or authz.es_director());

-- RLS no distingue columnas: la carga al SAG-UDAI (exclusiva del Director) se cuida aquí.
create or replace function documentos_seguimiento_proteger_sag_udai()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.fecha_carga_sag_udai is distinct from old.fecha_carga_sag_udai
     and not authz.es_director()
     and current_user = 'authenticated' then
    raise exception 'Solo el Director puede registrar la carga al SAG-UDAI';
  end if;
  return new;
end;
$$;

create trigger documentos_seguimiento_proteger_sag_udai
before update on documentos_seguimiento
for each row execute function documentos_seguimiento_proteger_sag_udai();

create policy documentos_seguimiento_auditores_select on documentos_seguimiento_auditores for select to authenticated
using (authz.puede_ver_documento_seguimiento(documento_id));

create policy documentos_seguimiento_auditores_insert on documentos_seguimiento_auditores for insert to authenticated
with check (
  exists (select 1 from documentos_seguimiento ds where ds.id = documento_id and authz.puede_nombrar_seguimiento(ds.departamento_id))
);

create policy documentos_seguimiento_informes_select on documentos_seguimiento_informes for select to authenticated
using (authz.puede_ver_documento_seguimiento(documento_id));

-- Quien nombra solo puede cubrir informes que ya ve.
create policy documentos_seguimiento_informes_insert on documentos_seguimiento_informes for insert to authenticated
with check (
  authz.puede_ver_informe(informe_id)
  and exists (select 1 from documentos_seguimiento ds where ds.id = documento_id and authz.puede_nombrar_seguimiento(ds.departamento_id))
);

-- La evaluación la registra el equipo/jefatura del informe o el auditor nombrado; el trigger
-- seguimientos_recomendacion_asignar_numero verifica además que el documento cubra el informe.
drop policy seguimientos_recomendacion_insert on seguimientos_recomendacion;
create policy seguimientos_recomendacion_insert on seguimientos_recomendacion for insert to authenticated
with check (
  registrado_por_nit = authz.nit_actual()
  and exists (
    select 1 from recomendaciones r
    join deficiencias d on d.id = r.deficiencia_id
    where r.id = recomendacion_id
      and (
        (documento_id is null and authz.puede_operar_informe(d.informe_id))
        or (
          documento_id is not null
          and authz.puede_dar_seguimiento(d.informe_id)
          and authz.puede_ver_documento_seguimiento(documento_id)
        )
      )
  )
);
