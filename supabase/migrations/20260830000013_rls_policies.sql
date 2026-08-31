-- Sección 8: políticas RLS. Cada tabla ya tuvo `enable row level security` en su propia
-- migración; aquí se agregan las políticas que efectivamente permiten algo (por defecto,
-- sin política, RLS deniega todo).

-- ── Datos de referencia: lectura abierta a cualquier autenticado, sin escritura de app ──
create policy departamentos_select on departamentos for select to authenticated using (true);
create policy subdirecciones_select on subdirecciones for select to authenticated using (true);
create policy documentos_catalogo_select on documentos_catalogo for select to authenticated using (true);
create policy documentos_catalogo_revision_select on documentos_catalogo_revision for select to authenticated using (true);

-- ── usuarios (sección 12.6: PII) ──
create policy usuarios_select on usuarios for select to authenticated
using (
  authz.es_director()
  or nit = authz.nit_actual()
  or departamento_id in (select authz.departamentos_visibles())
);

-- ── actividades ──
create policy actividades_select on actividades for select to authenticated
using (authz.puede_ver_actividad(id));

create policy actividades_insert on actividades for insert to authenticated
with check (
  authz.puede_escribir()
  and (
    authz.es_director()
    or (authz.cargo_actual() in ('jefe', 'subjefe') and departamento_id = authz.departamento_actual())
    or (authz.cargo_actual() = 'subdirector' and departamento_id in (select authz.departamentos_visibles()))
  )
);

create policy actividades_update on actividades for update to authenticated
using (authz.puede_ver_actividad(id))
with check (
  authz.puede_escribir()
  and (
    authz.es_director()
    or (authz.cargo_actual() in ('jefe', 'subjefe') and departamento_id = authz.departamento_actual())
    or (authz.cargo_actual() = 'subdirector' and departamento_id in (select authz.departamentos_visibles()))
  )
);

-- ── actividades_equipo ──
create policy actividades_equipo_select on actividades_equipo for select to authenticated
using (authz.puede_ver_actividad(actividad_id));

create policy actividades_equipo_insert on actividades_equipo for insert to authenticated
with check (authz.puede_operar_actividad(actividad_id));

create policy actividades_equipo_update on actividades_equipo for update to authenticated
using (authz.puede_ver_actividad(actividad_id))
with check (authz.puede_operar_actividad(actividad_id));

create policy actividades_equipo_delete on actividades_equipo for delete to authenticated
using (authz.puede_operar_actividad(actividad_id));

-- ── hitos_cronograma ──
create policy hitos_select on hitos_cronograma for select to authenticated
using (authz.puede_ver_actividad(actividad_id));

create policy hitos_insert on hitos_cronograma for insert to authenticated
with check (authz.puede_operar_actividad(actividad_id));

create policy hitos_update on hitos_cronograma for update to authenticated
using (authz.puede_ver_actividad(actividad_id))
with check (authz.puede_operar_actividad(actividad_id));

-- ── documentos_actividad ──
create policy documentos_actividad_select on documentos_actividad for select to authenticated
using (authz.puede_ver_actividad(actividad_id));

create policy documentos_actividad_insert on documentos_actividad for insert to authenticated
with check (authz.puede_operar_actividad(actividad_id));

create policy documentos_actividad_update on documentos_actividad for update to authenticated
using (authz.puede_ver_actividad(actividad_id))
with check (authz.puede_operar_actividad(actividad_id));

-- ── movimientos (sección 12.1: solo INSERT tiene política; UPDATE/DELETE quedan sin
-- ninguna, reforzados además por REVOKE y trigger en 20260830000008_movimientos.sql) ──
create policy movimientos_select on movimientos for select to authenticated
using (authz.puede_ver_documento(documento_actividad_id));

create policy movimientos_insert on movimientos for insert to authenticated
with check (
  authz.puede_operar_documento(documento_actividad_id)
  -- Nadie registra un movimiento "a nombre de" otro sin dejar constancia: quien hizo clic
  -- siempre es registrado_por_nit, incluso bajo captura_delegada (sección 4.9).
  and registrado_por_nit = authz.nit_actual()
  -- Sección 8/12.5: solo control_total inserta correcciones de Dirección.
  and (not es_correccion_direccion or authz.permiso_actual() = 'control_total')
  -- Sección 12.5: una aprobación es una decisión personal, no delegable.
  and (authz.permiso_actual() <> 'captura_delegada' or tipo_evento <> 'aprobacion')
);

-- ── oficios ──
create policy oficios_select on oficios for select to authenticated
using (authz.puede_ver_oficio(id));

create policy oficios_insert on oficios for insert to authenticated
with check (
  authz.puede_escribir()
  and (
    authz.es_director()
    or responsable_elaboracion_nit = authz.nit_actual()
    or (actividad_id is not null and authz.puede_ver_actividad(actividad_id))
  )
);

create policy oficios_update on oficios for update to authenticated
using (authz.puede_ver_oficio(id))
with check (
  authz.puede_escribir()
  and (
    authz.es_director()
    or responsable_elaboracion_nit = authz.nit_actual()
    or (actividad_id is not null and authz.puede_ver_actividad(actividad_id))
  )
);

-- ── oficios_revisores / oficios_firmantes ──
create policy oficios_revisores_select on oficios_revisores for select to authenticated
using (authz.puede_ver_oficio(oficio_id));
create policy oficios_revisores_insert on oficios_revisores for insert to authenticated
with check (authz.puede_operar_oficio(oficio_id));
create policy oficios_revisores_update on oficios_revisores for update to authenticated
using (authz.puede_ver_oficio(oficio_id)) with check (authz.puede_operar_oficio(oficio_id));
create policy oficios_revisores_delete on oficios_revisores for delete to authenticated
using (authz.puede_operar_oficio(oficio_id));

create policy oficios_firmantes_select on oficios_firmantes for select to authenticated
using (authz.puede_ver_oficio(oficio_id));
create policy oficios_firmantes_insert on oficios_firmantes for insert to authenticated
with check (authz.puede_operar_oficio(oficio_id));
create policy oficios_firmantes_update on oficios_firmantes for update to authenticated
using (authz.puede_ver_oficio(oficio_id)) with check (authz.puede_operar_oficio(oficio_id));
create policy oficios_firmantes_delete on oficios_firmantes for delete to authenticated
using (authz.puede_operar_oficio(oficio_id));

-- ── parametros_semaforo (sección 9/12.4: umbrales, propiedad de Dirección) ──
create policy parametros_semaforo_select on parametros_semaforo for select to authenticated using (true);
create policy parametros_semaforo_update on parametros_semaforo for update to authenticated
using (authz.permiso_actual() = 'control_total')
with check (authz.permiso_actual() = 'control_total');

-- ── calendario_feriados (mantenido por Dirección) ──
create policy calendario_feriados_select on calendario_feriados for select to authenticated using (true);
create policy calendario_feriados_insert on calendario_feriados for insert to authenticated
with check (authz.permiso_actual() = 'control_total');
create policy calendario_feriados_update on calendario_feriados for update to authenticated
using (authz.permiso_actual() = 'control_total')
with check (authz.permiso_actual() = 'control_total');
create policy calendario_feriados_delete on calendario_feriados for delete to authenticated
using (authz.permiso_actual() = 'control_total');
