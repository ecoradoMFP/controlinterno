-- Estructura organizacional del Ministerio de Finanzas Públicas (organigrama oficial): catálogo
-- de dependencias que se pueden auditar. Los formularios la usan en el selector "Dependencia
-- auditada" y Dirección (control_total) la mantiene desde Configuración si la estructura cambia.
-- Los informes/actividades guardan el NOMBRE de la dependencia como texto (foto histórica): si una
-- dirección se renombra más adelante, lo ya emitido conserva el nombre vigente cuando se auditó.
create table unidades_ministerio (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  -- null = raíz (Despacho Ministerial). Los viceministerios cuelgan del despacho y sus direcciones
  -- del viceministerio; las direcciones de apoyo cuelgan directamente del despacho.
  padre_id uuid references unidades_ministerio(id) on delete restrict,
  orden integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index unidades_ministerio_nombre_idx on unidades_ministerio (lower(nombre));
create index unidades_ministerio_padre_idx on unidades_ministerio (padre_id);

alter table unidades_ministerio enable row level security;
grant select on unidades_ministerio to authenticated;
grant insert, update on unidades_ministerio to authenticated;

create policy unidades_ministerio_select on unidades_ministerio for select to authenticated using (true);
create policy unidades_ministerio_insert on unidades_ministerio for insert to authenticated
with check (authz.permiso_actual() = 'control_total');
create policy unidades_ministerio_update on unidades_ministerio for update to authenticated
using (authz.permiso_actual() = 'control_total')
with check (authz.permiso_actual() = 'control_total');
-- Sin delete: una unidad que ya no existe se desactiva (activo = false) para no perder el rastro.

insert into unidades_ministerio (nombre, padre_id, orden)
values ('Despacho Ministerial', null, 0);

with despacho as (select id from unidades_ministerio where nombre = 'Despacho Ministerial')
insert into unidades_ministerio (nombre, padre_id, orden)
select v.nombre, d.id, v.orden
from despacho d, (values
  -- Direcciones de apoyo / asesoría del Despacho
  ('Dirección de Planificación y Desarrollo Institucional', 1),
  ('Dirección de Asesoría Jurídica', 2),
  ('Dirección de Comunicación Social', 3),
  ('Dirección de Asesoría Específica', 4),
  ('Secretaría General', 5),
  ('Dirección de Fiscalidad Ambiental para el Cambio Climático y la Sostenibilidad', 6),
  ('Dirección de Auditoría Interna', 7),
  -- Viceministerios
  ('Viceministerio de Administración Financiera', 10),
  ('Viceministerio de Ingresos y Evaluación Fiscal', 11),
  ('Viceministerio de Transparencia Fiscal y Adquisiciones del Estado', 12),
  ('Viceministerio de Administración Interna y Desarrollo de Sistemas', 13)
) as v(nombre, orden);

insert into unidades_ministerio (nombre, padre_id, orden)
select u.nombre, p.id, u.orden
from (values
  ('Viceministerio de Administración Financiera', 'Dirección Técnica del Presupuesto', 1),
  ('Viceministerio de Administración Financiera', 'Dirección de Contabilidad del Estado', 2),
  ('Viceministerio de Administración Financiera', 'Tesorería Nacional', 3),
  ('Viceministerio de Administración Financiera', 'Dirección de Crédito Público', 4),
  ('Viceministerio de Ingresos y Evaluación Fiscal', 'Dirección de Análisis y Política Fiscal', 1),
  ('Viceministerio de Ingresos y Evaluación Fiscal', 'Dirección de Bienes del Estado', 2),
  ('Viceministerio de Ingresos y Evaluación Fiscal', 'Dirección de Catastro y Avalúo de Bienes Inmuebles', 3),
  ('Viceministerio de Ingresos y Evaluación Fiscal', 'Dirección de Fideicomisos', 4),
  ('Viceministerio de Transparencia Fiscal y Adquisiciones del Estado', 'Dirección de Transparencia Fiscal', 1),
  ('Viceministerio de Transparencia Fiscal y Adquisiciones del Estado', 'Registro General de Adquisiciones del Estado', 2),
  ('Viceministerio de Transparencia Fiscal y Adquisiciones del Estado', 'Dirección General de Adquisiciones del Estado', 3),
  ('Viceministerio de Transparencia Fiscal y Adquisiciones del Estado', 'Dirección de Formación y Desarrollo Profesional en Adquisiciones del Estado', 4),
  ('Viceministerio de Administración Interna y Desarrollo de Sistemas', 'Dirección Financiera', 1),
  ('Viceministerio de Administración Interna y Desarrollo de Sistemas', 'Dirección de Recursos Humanos', 2),
  ('Viceministerio de Administración Interna y Desarrollo de Sistemas', 'Dirección de Asuntos Administrativos', 3),
  ('Viceministerio de Administración Interna y Desarrollo de Sistemas', 'Dirección de Tecnologías de la Información', 4),
  ('Viceministerio de Administración Interna y Desarrollo de Sistemas', 'Dirección de Asistencia a la Administración Financiera Municipal', 5),
  ('Viceministerio de Administración Interna y Desarrollo de Sistemas', 'Taller Nacional de Grabados en Acero', 6)
) as u(padre, nombre, orden)
join unidades_ministerio p on p.nombre = u.padre;
