-- Importa la matriz completa de revisión (documento × departamento × cargo) desde el Excel
-- fuente "REVISIONES POR DOCUMENTO.xlsx" (sección 4.5.1 / punto 4 del cuestionario de
-- consenso), reemplazando los 2 documentos sembrados como smoke test en seed.sql.
--
-- Cambios acordados en sesión 2026-09-18:
-- 1. La matriz estandarizada NO varía por departamento (a diferencia del ejemplo de
--    "Cronograma proyectado" documentado en el prompt maestro sección 4.5, donde el Jefe
--    revisaba en Especiales/Administrativas pero no en Financieras) -- el Excel fuente ya
--    estandarizado marca el mismo flujo en los 3 departamentos para los 18 documentos.
--    En particular, "Cronograma proyectado" deja de pasar por Jefe en cualquier
--    departamento (antes sí en 2 de 3).
-- 2. Documentos #16 (Notificación de Conclusiones preliminares) y #18 del archivo fuente /
--    orden 17 en catálogo (Análisis de Respuestas) quedaban con Subjefe/Jefe sin marcar en
--    Especiales en el Excel entregado -- confirmado que debe ser igual que en Financieras y
--    Administrativas (Auditor → Subjefe → Jefe en los 3 departamentos).
-- 3. orden_revision se deriva de la posición de la columna en el Excel (Auditor, Subjefe,
--    Jefe, Subdirector, Director siempre en ese orden), no de una columna aparte -- el
--    flujo es lineal y las correcciones siempre regresan a Auditor (no a un paso
--    intermedio), así que no hace falta capturar el orden como dato manual.

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
