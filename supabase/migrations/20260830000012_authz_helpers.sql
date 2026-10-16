create schema if not exists authz;

revoke all on schema authz from anon, authenticated;
grant usage on schema authz to authenticated;

create or replace function authz.usuario_actual()
returns usuarios
language sql stable security definer set search_path = public
as $$
  select u.* from usuarios u where u.auth_user_id = auth.uid();
$$;

create or replace function authz.nit_actual()
returns text
language sql stable security definer set search_path = public
as $$
  select nit from authz.usuario_actual();
$$;

create or replace function authz.cargo_actual()
returns cargo_enum
language sql stable security definer set search_path = public
as $$
  select cargo from authz.usuario_actual();
$$;

create or replace function authz.permiso_actual()
returns permiso_sistema_enum
language sql stable security definer set search_path = public
as $$
  select permiso_sistema from authz.usuario_actual();
$$;

create or replace function authz.departamento_actual()
returns uuid
language sql stable security definer set search_path = public
as $$
  select departamento_id from authz.usuario_actual();
$$;

create or replace function authz.es_director()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(authz.cargo_actual() = 'director', false);
$$;

create or replace function authz.puede_escribir()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(authz.permiso_actual() in ('captura_propia', 'captura_delegada', 'control_total'), false);
$$;

create or replace function authz.subdireccion_actual()
returns uuid
language sql stable security definer set search_path = public
as $$
  select s.id from subdirecciones s where s.subdirector_nit = authz.nit_actual();
$$;

create or replace function authz.departamentos_visibles()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select d.id
  from departamentos d
  where
    authz.es_director()
    or (authz.cargo_actual() = 'subdirector' and d.subdireccion_id = authz.subdireccion_actual())
    or (authz.cargo_actual() in ('jefe', 'subjefe', 'auditor') and d.id = authz.departamento_actual());
$$;

create or replace function authz.es_miembro_equipo(p_actividad_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from actividades_equipo ae
    where ae.actividad_id = p_actividad_id and ae.usuario_nit = authz.nit_actual()
  ) or exists (
    select 1 from actividades a
    where a.id = p_actividad_id and a.auditor_principal_nit = authz.nit_actual()
  );
$$;

create or replace function authz.puede_ver_actividad(p_actividad_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    authz.es_director()
    or exists (
      select 1 from actividades a
      where a.id = p_actividad_id
        and (
          (authz.cargo_actual() in ('jefe', 'subjefe') and a.departamento_id = authz.departamento_actual())
          or (
            authz.cargo_actual() = 'subdirector'
            and a.departamento_id in (
              select d.id from departamentos d where d.subdireccion_id = authz.subdireccion_actual()
            )
          )
          or authz.es_miembro_equipo(a.id)
        )
    );
$$;

create or replace function authz.puede_operar_actividad(p_actividad_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select authz.puede_escribir() and authz.puede_ver_actividad(p_actividad_id);
$$;

create or replace function authz.puede_ver_documento(p_documento_actividad_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select authz.es_director() or exists (
    select 1 from documentos_actividad da
    where da.id = p_documento_actividad_id and authz.puede_ver_actividad(da.actividad_id)
  );
$$;

create or replace function authz.puede_operar_documento(p_documento_actividad_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select authz.puede_escribir() and exists (
    select 1 from documentos_actividad da
    where da.id = p_documento_actividad_id and authz.puede_ver_actividad(da.actividad_id)
  );
$$;

create or replace function authz.puede_ver_oficio(p_oficio_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    authz.es_director()
    or exists (
      select 1 from oficios o
      left join usuarios resp on resp.nit = o.responsable_elaboracion_nit
      where o.id = p_oficio_id
        and (
          o.responsable_elaboracion_nit = authz.nit_actual()
          or (o.actividad_id is not null and authz.puede_ver_actividad(o.actividad_id))
          or (o.actividad_id is null and resp.departamento_id in (select authz.departamentos_visibles()))
        )
    );
$$;

create or replace function authz.puede_operar_oficio(p_oficio_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select authz.puede_escribir() and authz.puede_ver_oficio(p_oficio_id);
$$;

grant execute on all functions in schema authz to authenticated;
alter default privileges in schema authz grant execute on functions to authenticated;
