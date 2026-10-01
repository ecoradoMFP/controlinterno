-- Corregir errores de captura de una recomendación (editarla o eliminarla) SIN perder trazabilidad.
--  * "Eliminar" es una anulación lógica: la fila queda con anulada_en y deja de verse (RLS), pero
--    nunca se borra, y no existe grant de delete.
--  * Todo cambio de contenido exige un motivo y queda en recomendaciones_historial (append-only) con
--    el valor anterior, el nuevo, quién y cuándo. Lo escribe un trigger: no depende de la app.
--  * Solo se puede corregir mientras la recomendación no tenga seguimientos evaluados: después ya
--    hay informes que se apoyan en su texto y no debe cambiar.

alter table recomendaciones add column anulada_en timestamptz;
-- Canal para que la app entregue el motivo en el mismo UPDATE; el trigger lo consume y lo limpia.
alter table recomendaciones add column motivo_ultimo_cambio text;

-- Una recomendación anulada libera su número dentro de la deficiencia.
alter table recomendaciones drop constraint recomendaciones_deficiencia_id_numero_key;
create unique index recomendaciones_deficiencia_numero_vigente_idx
  on recomendaciones (deficiencia_id, numero) where anulada_en is null;

create table recomendaciones_historial (
  id uuid primary key default gen_random_uuid(),
  recomendacion_id uuid not null references recomendaciones(id),
  informe_id uuid not null references informes_auditoria(id),
  accion text not null check (accion in ('editada', 'anulada')),
  datos_anteriores jsonb not null,
  datos_nuevos jsonb,
  motivo text not null check (length(btrim(motivo)) >= 5),
  usuario_nit text not null references usuarios(nit),
  created_at timestamptz not null default now()
);
create index recomendaciones_historial_informe_idx on recomendaciones_historial (informe_id, created_at desc);

alter table recomendaciones_historial enable row level security;
grant select on recomendaciones_historial to authenticated;  -- sin insert/update/delete: solo el trigger escribe
create policy recomendaciones_historial_select on recomendaciones_historial for select to authenticated
using (authz.puede_ver_informe(informe_id));

-- Las recomendaciones anuladas no se ven; editar/anular exige poder operar el informe.
drop policy recomendaciones_select on recomendaciones;
create policy recomendaciones_select on recomendaciones for select to authenticated
using (anulada_en is null and exists (select 1 from deficiencias d where d.id = deficiencia_id and authz.puede_ver_informe(d.informe_id)));

drop policy recomendaciones_update on recomendaciones;
create policy recomendaciones_update on recomendaciones for update to authenticated
using (anulada_en is null and exists (select 1 from deficiencias d where d.id = deficiencia_id and authz.puede_operar_informe(d.informe_id)))
with check (exists (select 1 from deficiencias d where d.id = deficiencia_id and authz.puede_operar_informe(d.informe_id)));

-- Solo estas columnas son editables por la app (estado_actual lo mantiene su trigger).
revoke update on recomendaciones from authenticated;
grant update (texto, responsables, fecha_implementacion, motivo_ultimo_cambio) on recomendaciones to authenticated;

create or replace function recomendaciones_registrar_cambio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cambia_contenido boolean;
  v_anula boolean;
  v_informe uuid;
begin
  -- Solo usuarios de la aplicación; las cargas con service role (importadores) no pasan por aquí.
  -- Se mira el rol del JWT: dentro de security definer current_user es el dueño de la función.
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;

  v_anula := new.anulada_en is not null and old.anulada_en is null;
  v_cambia_contenido := new.texto is distinct from old.texto
    or new.responsables is distinct from old.responsables
    or new.fecha_implementacion is distinct from old.fecha_implementacion;

  if new.numero is distinct from old.numero or new.deficiencia_id is distinct from old.deficiencia_id then
    raise exception 'No se puede cambiar el número ni la deficiencia de una recomendación';
  end if;
  if old.anulada_en is not null and new.anulada_en is distinct from old.anulada_en then
    raise exception 'Una recomendación anulada no se puede restaurar';
  end if;

  if not (v_anula or v_cambia_contenido) then
    new.motivo_ultimo_cambio := null;
    return new;
  end if;

  if length(btrim(coalesce(new.motivo_ultimo_cambio, ''))) < 5 then
    raise exception 'Indica el motivo del cambio (mínimo 5 caracteres)';
  end if;
  if exists (select 1 from seguimientos_recomendacion where recomendacion_id = old.id and numero_seguimiento > 0) then
    raise exception 'La recomendación ya tiene seguimientos evaluados: no se puede editar ni eliminar';
  end if;

  select informe_id into v_informe from deficiencias where id = old.deficiencia_id;
  if v_anula then
    new.anulada_en := now();
  end if;

  insert into recomendaciones_historial (recomendacion_id, informe_id, accion, datos_anteriores, datos_nuevos, motivo, usuario_nit)
  values (
    old.id, v_informe,
    case when v_anula then 'anulada' else 'editada' end,
    jsonb_build_object('numero', old.numero, 'texto', old.texto, 'responsables', old.responsables, 'fecha_implementacion', old.fecha_implementacion),
    case when v_anula then null
         else jsonb_build_object('numero', new.numero, 'texto', new.texto, 'responsables', new.responsables, 'fecha_implementacion', new.fecha_implementacion) end,
    btrim(new.motivo_ultimo_cambio),
    authz.nit_actual()
  );

  new.motivo_ultimo_cambio := null;
  return new;
end;
$$;

revoke execute on function recomendaciones_registrar_cambio() from public, anon, authenticated;

create trigger recomendaciones_registrar_cambio
before update on recomendaciones
for each row execute function recomendaciones_registrar_cambio();

-- Anular no puede ser un UPDATE directo: la fila anulada deja de cumplir la policy de select y
-- Postgres rechaza el UPDATE ("new row violates row-level security policy"). Esta función valida
-- el permiso por dentro y hace el UPDATE como dueño; el trigger anterior sigue aplicando las
-- reglas (motivo obligatorio, sin seguimientos) y escribiendo el historial.
create or replace function anular_recomendacion(p_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_informe uuid;
begin
  select d.informe_id into v_informe
  from recomendaciones r join deficiencias d on d.id = r.deficiencia_id
  where r.id = p_id and r.anulada_en is null;

  if v_informe is null or not authz.puede_operar_informe(v_informe) then
    raise exception 'No tienes permiso para eliminar esta recomendación';
  end if;

  update recomendaciones set anulada_en = now(), motivo_ultimo_cambio = p_motivo where id = p_id;
end;
$$;

revoke execute on function anular_recomendacion(uuid, text) from public, anon;
grant execute on function anular_recomendacion(uuid, text) to authenticated;
