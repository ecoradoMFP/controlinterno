insert into subdirecciones (nombre) values
  ('Subdirección de Auditorías Financieras, Administrativas y de Procesos'),
  ('Subdirección de Auditorías Especiales');

insert into departamentos (nombre, sigla, subdireccion_id)
select 'Departamento de Auditorías Financieras', 'DAF', s.id
from subdirecciones s
where s.nombre = 'Subdirección de Auditorías Financieras, Administrativas y de Procesos'
union all
select 'Departamento de Auditorías Administrativas y de Procesos', 'DAAP', s.id
from subdirecciones s
where s.nombre = 'Subdirección de Auditorías Financieras, Administrativas y de Procesos'
union all
select 'Departamento de Auditorías Especiales', 'DAE', s.id
from subdirecciones s
where s.nombre = 'Subdirección de Auditorías Especiales';

insert into documentos_catalogo (etapa, orden, nombre, observaciones) values
  ('planificacion', 1, 'Cronograma proyectado', null),
  ('planificacion', 2, 'Conocimiento y Comprensión del Área', null),
  ('planificacion', 3, 'Requerimiento de Información', null),
  ('planificacion', 4, 'Elaboración de Matriz de Evaluación de Riesgos y Controles', null),
  ('planificacion', 5, 'Cuestionario de Control Interno', null),
  ('planificacion', 6, 'Ponderación de la Matriz de Evaluación', null),
  ('planificacion', 7, 'Gestión de Áreas (Muestreo y Asignación de Áreas, Métodos a utilizar)', null),
  ('planificacion', 8, 'Programa de Auditoría', null),
  ('planificacion', 9, 'Memorando de Planificación y Cronograma', null),
  ('ejecucion', 10, 'Requerimiento de Documentos a verificar en la Muestra', null),
  ('ejecucion', 11, 'PT Cédula Centralizadora', null),
  ('ejecucion', 12, 'PT Cédula Sumaria, Analítica, Atributos Sistema', null),
  ('ejecucion', 13, 'PT Cédula General', null),
  ('comunicacion_resultados', 14, 'Determinación de deficiencias', null),
  ('comunicacion_resultados', 15, 'Elaboración de Conclusiones preliminares (Deficiencias)', null),
  ('comunicacion_resultados', 16, 'Notificación de Conclusiones preliminares (Deficiencias)', null),
  ('comunicacion_resultados', 17, 'Análisis de Respuestas',
    'Numerado 18 en el archivo fuente DOCUMENTOS_QUE_SE_GENERAN_EN_EL_CAI; renumerado secuencialmente aquí (sección 4.5.1).'),
  ('comunicacion_resultados', 18, 'Elaboración y Conclusión final (Informe de Auditoría)',
    'Numerado 19 en el archivo fuente DOCUMENTOS_QUE_SE_GENERAN_EN_EL_CAI, saltando el 17; renumerado secuencialmente aquí (sección 4.5.1).');

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

insert into calendario_feriados (fecha, descripcion) values
  ('2026-01-01', 'Año Nuevo'),
  ('2026-04-02', 'Jueves Santo'),
  ('2026-04-03', 'Viernes Santo'),
  ('2026-05-01', 'Día del Trabajo'),
  ('2026-06-30', 'Día del Ejército'),
  ('2026-09-15', 'Día de la Independencia'),
  ('2026-10-07', 'Aniversario MINFIN/DAI'),
  ('2026-10-20', 'Día de la Revolución'),
  ('2026-11-01', 'Día de Todos los Santos'),
  ('2026-12-25', 'Navidad');

insert into parametros_semaforo (ambito, umbral_verde_pct, umbral_amarillo_pct, umbral_naranja_pct) values
  ('hito', 50, 25, 0),
  ('oficio', 50, 25, 0),
  ('actividad', 50, 25, 0);
