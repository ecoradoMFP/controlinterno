delete from documentos_catalogo_revision;

with doc as (
  select id, etapa, orden from documentos_catalogo
),
dep as (
  select id, nombre from departamentos
)
insert into documentos_catalogo_revision (documento_catalogo_id, departamento_id, cargo, orden_revision)
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 1 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 1 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 1 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 1 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 1 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 1 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 2 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 2 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 2 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 2 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 2 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 2 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 2 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 2 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 2 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 3 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 3 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 3 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 3 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 3 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 3 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 3 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 3 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 3 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 3 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 3 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 3 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 4 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 4 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 4 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 4 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 4 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 4 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 4 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 4 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 4 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 5 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 5 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 5 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 5 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 5 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 5 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 5 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 5 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 5 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 6 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 6 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 6 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 6 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 6 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 6 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 6 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 6 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 6 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 7 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 7 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 7 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 7 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 7 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 7 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'director'::cargo_enum, 5 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'director'::cargo_enum, 5 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'director'::cargo_enum, 5 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 8 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'director'::cargo_enum, 5 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'director'::cargo_enum, 5 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'director'::cargo_enum, 5 from doc, dep where doc.etapa = 'planificacion' and doc.orden = 9 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 10 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 10 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 10 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 10 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 10 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 10 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 10 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 10 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 10 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 10 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 10 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 10 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 11 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 11 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 11 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 11 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 11 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 11 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 11 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 11 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 11 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 12 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 12 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 12 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 12 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 12 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 12 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 12 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 12 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 12 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 13 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 13 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 13 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 13 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 13 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 13 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 13 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 13 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'ejecucion' and doc.orden = 13 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 14 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 14 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 14 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 14 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 14 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 14 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 14 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 14 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 14 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'director'::cargo_enum, 5 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'director'::cargo_enum, 5 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'director'::cargo_enum, 5 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 15 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 16 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 16 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 16 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 16 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 16 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 16 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 16 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 16 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 16 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 17 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 17 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 17 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 17 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 17 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 17 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 17 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 17 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 17 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'director'::cargo_enum, 5 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Especiales'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'director'::cargo_enum, 5 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Financieras'
union all
select doc.id, dep.id, 'auditor'::cargo_enum, 1 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subjefe'::cargo_enum, 2 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'jefe'::cargo_enum, 3 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'subdirector'::cargo_enum, 4 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select doc.id, dep.id, 'director'::cargo_enum, 5 from doc, dep where doc.etapa = 'comunicacion_resultados' and doc.orden = 18 and dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
;
