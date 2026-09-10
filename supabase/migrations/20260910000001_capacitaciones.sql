-- Módulo de capacitaciones (nuevo, urgente): seguimiento del cumplimiento de la norma interna
-- de 50 horas de capacitación anual por persona. El módulo de trazabilidad queda en pausa
-- hasta la reunión de consenso sobre el catálogo de 18 documentos (ver
-- cuestionario-consenso-proceso.md) — este módulo es independiente de esa discusión.
--
-- Se apoya directamente en `usuarios` (mismo patrón que actividades_equipo/oficios_revisores/
-- notificaciones: `usuario_nit text references usuarios(nit)`), sin tabla ni esquema nuevo
-- para "personal" — la nómina real de la DAI todavía no tiene cuenta de alta en el sistema, así
-- que por ahora este módulo trabaja con los mismos usuarios (de prueba u operativos) que ya
-- existen en `usuarios`. Cuando se dé de alta al resto del personal real (NIT/correo/cargo,
-- fuera de RLS de aplicación — sección 12.4, igual que siempre), ya van a poder registrar/
-- recibir capacitaciones sin ningún cambio adicional.
create table capacitaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_nit text not null references usuarios(nit),
  nombre text not null,
  institucion text not null,
  horas numeric(5,2) not null check (horas > 0),
  fecha date not null,
  -- Columna generada: filtrar/agrupar por año (el ciclo de cumplimiento es anual) sin repetir
  -- extract(year from fecha) en cada consulta.
  anio integer generated always as (extract(year from fecha)::int) stored,
  -- Reservado para cuando se habilite Supabase Storage (requiere plan pago): adjuntar el
  -- certificado de cada capacitación sin otra migración cuando llegue ese momento. Sin UI de
  -- carga todavía — mismo criterio que la sección 12.7 del módulo de trazabilidad (sin carga
  -- de archivos en esta fase).
  certificado_url text,
  registrado_por_nit text not null references usuarios(nit),
  created_at timestamptz not null default now()
);

create index capacitaciones_usuario_nit_idx on capacitaciones(usuario_nit);
create index capacitaciones_anio_idx on capacitaciones(anio);

alter table capacitaciones enable row level security;

revoke all on capacitaciones from anon, authenticated;
grant select, insert, update, delete on capacitaciones to authenticated;

-- Lista blanca explícita de cargos que pueden gestionar capacitaciones (propias o ajenas),
-- en vez de "cargo <> 'auditor'": el sistema puede tener personal no jerárquico sin cargo
-- (sección 4.3, ej. un asistente de archivo, `cargo is null`). Con `<> 'auditor'`, un cargo
-- NULL evalúa a NULL (ni true ni false) y RLS lo trata como "denegar" solo por cómo Postgres
-- compara con NULL — funciona hoy, pero es un accidente del que no hay que depender: alguien
-- podría "corregir" esa comparación más adelante (ej. a `is distinct from`) y reabrir el
-- acceso sin darse cuenta. Con CASE + ELSE false, un cargo NULL cae explícitamente en el
-- default de denegar, sin importar cómo se compare.
create or replace function authz.tiene_cargo_gestion_capacitaciones()
returns boolean
language sql stable security definer set search_path = public
as $$
  select case authz.cargo_actual()
    when 'jefe' then true
    when 'subjefe' then true
    when 'subdirector' then true
    when 'director' then true
    else false
  end;
$$;

grant execute on function authz.tiene_cargo_gestion_capacitaciones() to authenticated;

-- Alcance de gestión (cargar/corregir capacitaciones de otra persona): igual que el resto del
-- sistema (jefe/subjefe su propio departamento, subdirector su subdirección, director todo).
-- Director puede gestionar incluso departamento_id null (su propio caso y el de Subdirección,
-- que no pertenecen a un departamento).
create or replace function authz.puede_gestionar_capacitaciones(p_departamento_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    authz.puede_escribir()
    and authz.tiene_cargo_gestion_capacitaciones()
    and (
      authz.es_director()
      or (p_departamento_id is not null and p_departamento_id in (select authz.departamentos_visibles()))
    );
$$;

grant execute on function authz.puede_gestionar_capacitaciones(uuid) to authenticated;

-- Visibilidad: se apoya en la RLS que ya tiene `usuarios` (sección 12.6, PII) en vez de
-- duplicar su lógica — si la sesión actual no puede ver esa fila de `usuarios`, la subconsulta
-- no la encuentra y esta policy tampoco.
create policy capacitaciones_select on capacitaciones for select to authenticated
using (exists (select 1 from usuarios u where u.nit = usuario_nit));

-- Además del alcance departamental de `puede_gestionar_capacitaciones`, cualquiera con un
-- cargo de la lista blanca (`tiene_cargo_gestion_capacitaciones`) puede registrar/corregir sus
-- propias capacitaciones — necesario para Director/Subdirección, que no tienen
-- `departamento_id` y por eso quedan fuera del alcance departamental de la función.
create policy capacitaciones_insert on capacitaciones for insert to authenticated
with check (
  registrado_por_nit = authz.nit_actual()
  and (
    (authz.puede_escribir() and authz.tiene_cargo_gestion_capacitaciones() and usuario_nit = authz.nit_actual())
    or exists (select 1 from usuarios u where u.nit = usuario_nit and authz.puede_gestionar_capacitaciones(u.departamento_id))
  )
);

create policy capacitaciones_update on capacitaciones for update to authenticated
using (
  (authz.puede_escribir() and authz.tiene_cargo_gestion_capacitaciones() and usuario_nit = authz.nit_actual())
  or exists (select 1 from usuarios u where u.nit = usuario_nit and authz.puede_gestionar_capacitaciones(u.departamento_id))
)
with check (
  (authz.puede_escribir() and authz.tiene_cargo_gestion_capacitaciones() and usuario_nit = authz.nit_actual())
  or exists (select 1 from usuarios u where u.nit = usuario_nit and authz.puede_gestionar_capacitaciones(u.departamento_id))
);

create policy capacitaciones_delete on capacitaciones for delete to authenticated
using (
  (authz.puede_escribir() and authz.tiene_cargo_gestion_capacitaciones() and usuario_nit = authz.nit_actual())
  or exists (select 1 from usuarios u where u.nit = usuario_nit and authz.puede_gestionar_capacitaciones(u.departamento_id))
);
