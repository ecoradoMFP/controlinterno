-- Seed data — prompt maestro sección 2 y 11.2.
-- Ejecutado automáticamente por `supabase db reset`.

-- ── 1. Estructura organizacional fija (sección 1) ──
insert into subdirecciones (nombre) values
  ('Subdirección de Auditorías Financieras, Administrativas y de Procesos'),
  ('Subdirección de Auditorías Especiales');
-- subdirector_nit queda NULL: no se inventan NIT de funcionarios reales. Se completa cuando
-- se dé de alta a la persona real vía el flujo administrativo (sección 12.4).

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

-- ── 2. Catálogo de 18 documentos (sección 4.5.1) ──
insert into documentos_catalogo (etapa, orden, nombre, observaciones) values
  ('planificacion', 1, 'Cronograma proyectado', null),
  ('planificacion', 2, 'Conocimiento y Comprensión del Área', null),
  ('planificacion', 3, 'Requerimiento de Información', null),
  ('planificacion', 4, 'Elaboración de Matriz de Evaluación de Riesgos y Controles', null),
  ('planificacion', 5, 'Cuestionario de Control Interno', null),
  ('planificacion', 6, 'Ponderación de la Matriz de Evaluación', null),
  ('planificacion', 7, 'Gestión de Áreas (Muestreo y Asignación de Áreas)', null),
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

-- Pasos que no generan un documento como tal (mismo dato que la migración
-- 20261002000002_documentos_no_aplica.sql; se repite por el orden migraciones → seed).
update documentos_catalogo set genera_documento = false where orden in (2, 7);

-- ── 3. Matriz de revisión (documento × departamento × cargo) ──
-- Misma importación que la migración 20260918000001_matriz_revision_documentos.sql (Excel
-- "REVISIONES POR DOCUMENTO"). Se repite aquí porque en un `supabase db reset` las migraciones
-- corren antes que este seed, cuando el catálogo todavía está vacío, y la matriz quedaba sin
-- filas — el flujo de revisión guiado (`avanzar_documento`) depende de ella completa.
delete from documentos_catalogo_revision;

with doc as (
  select id, etapa, orden from documentos_catalogo
),
dep as (
  select id, nombre from departamentos
)
insert into documentos_catalogo_revision (documento_catalogo_id, departamento_id, cargo, orden_revision)
-- Cronograma proyectado (etapa=planificacion, orden=1)
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
-- Conocimiento y Comprensión del Área (etapa=planificacion, orden=2)
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
-- Requerimiento de Información (etapa=planificacion, orden=3)
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
-- Elaboración de Matriz de Evaluación de Riesgos y Controles (etapa=planificacion, orden=4)
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
-- Cuestionario de Control Interno (etapa=planificacion, orden=5)
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
-- Ponderación de la Matriz de Evaluación (etapa=planificacion, orden=6)
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
-- Gestión de Áreas (etapa=planificacion, orden=7)
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
-- Programa de Auditoría (etapa=planificacion, orden=8)
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
-- Memorando de Planificación y Cronograma (etapa=planificacion, orden=9)
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
-- Requerimiento de Documentos a verificar en la Muestra (etapa=ejecucion, orden=10)
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
-- PT Cédula Centralizadora (etapa=ejecucion, orden=11)
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
-- PT Cédula Sumaria, Analítica, Atributos Sistema (etapa=ejecucion, orden=12)
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
-- PT Cédula General (etapa=ejecucion, orden=13)
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
-- Determinación de deficiencias (etapa=comunicacion_resultados, orden=14)
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
-- Elaboración de Conclusiones preliminares (etapa=comunicacion_resultados, orden=15)
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
-- Notificación de Conclusiones preliminares (etapa=comunicacion_resultados, orden=16)
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
-- Análisis de Respuestas (etapa=comunicacion_resultados, orden=17)
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
-- Elaboración y Conclusión final (etapa=comunicacion_resultados, orden=18)
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

-- ── 4. Calendario de feriados (sección 4.12) ──
-- Bootstrap con los feriados oficiales fijos/calculables de Guatemala para 2026, más el
-- aniversario de MINFIN/DAI (7 de octubre). Requiere mantenimiento anual: las fechas movibles
-- de Semana Santa cambian cada año y deben revisarse al iniciar cada ciclo.
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

-- ── 5. Umbrales del motor de semáforo (sección 4.11/5) ──
-- Valores por defecto de la sección 5: verde ≥50% de plazo restante, amarillo 25-50%,
-- naranja 0-25%, rojo <=0%. Configurables después por Dirección (control_total) vía UPDATE,
-- nunca hardcodeados en la aplicación.
insert into parametros_semaforo (ambito, umbral_verde_pct, umbral_amarillo_pct, umbral_naranja_pct) values
  ('hito', 50, 25, 0),
  ('oficio', 50, 25, 0),
  ('actividad', 50, 25, 0);
