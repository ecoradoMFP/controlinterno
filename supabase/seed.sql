-- Seed data — prompt maestro sección 2 y 11.2.
-- Ejecutado automáticamente por `supabase db reset`.

-- ── 1. Estructura organizacional fija (sección 1) ──
insert into subdirecciones (nombre) values
  ('Subdirección de Auditorías Financieras, Administrativas y de Procesos'),
  ('Subdirección de Auditorías Especiales');
-- subdirector_nit queda NULL: no se inventan NIT de funcionarios reales. Se completa cuando
-- se dé de alta a la persona real vía el flujo administrativo (sección 12.4).

insert into departamentos (nombre, subdireccion_id)
select 'Departamento de Auditorías Financieras', s.id
from subdirecciones s
where s.nombre = 'Subdirección de Auditorías Financieras, Administrativas y de Procesos'
union all
select 'Departamento de Auditorías Administrativas y de Procesos', s.id
from subdirecciones s
where s.nombre = 'Subdirección de Auditorías Financieras, Administrativas y de Procesos'
union all
select 'Departamento de Auditorías Especiales', s.id
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

-- ── 3. Matriz de revisión (documento × departamento × cargo) ──
-- IMPORTANTE: el prompt maestro (sección 4.5.1) es explícito en que esta matriz completa
-- (~15 columnas de marcas por cada una de las 18 filas) debe importarse tal cual del Excel
-- fuente, no retranscribirse a mano por riesgo de error. Ese Excel todavía no se ha
-- entregado, así que aquí solo se siembran los DOS ejemplos que el propio prompt documenta
-- literalmente, a modo de smoke test del modelo. El resto de la matriz llega en un script de
-- importación aparte cuando se reciba el archivo fuente — no se debe completar a mano.
with doc_cronograma as (
  select id from documentos_catalogo where etapa = 'planificacion' and orden = 1
),
doc_memorando as (
  select id from documentos_catalogo where etapa = 'planificacion' and orden = 9
),
dep as (
  select id, nombre from departamentos
)
insert into documentos_catalogo_revision (documento_catalogo_id, departamento_id, cargo, orden_revision)
-- Cronograma proyectado: Auditor elabora y Subjefe revisa en los 3 departamentos; Jefe
-- revisa solo en Especiales y Administrativas, NO en Financieras.
-- (cast explícito a cargo_enum: dentro de un UNION, Postgres resuelve el literal como text
-- y no lo castea implícitamente al tipo de la columna destino).
select (select id from doc_cronograma), dep.id, 'auditor'::cargo_enum, 1 from dep where dep.nombre = 'Departamento de Auditorías Financieras'
union all
select (select id from doc_cronograma), dep.id, 'subjefe'::cargo_enum, 2 from dep where dep.nombre = 'Departamento de Auditorías Financieras'
union all
select (select id from doc_cronograma), dep.id, 'auditor'::cargo_enum, 1 from dep where dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select (select id from doc_cronograma), dep.id, 'subjefe'::cargo_enum, 2 from dep where dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select (select id from doc_cronograma), dep.id, 'jefe'::cargo_enum, 3 from dep where dep.nombre = 'Departamento de Auditorías Administrativas y de Procesos'
union all
select (select id from doc_cronograma), dep.id, 'auditor'::cargo_enum, 1 from dep where dep.nombre = 'Departamento de Auditorías Especiales'
union all
select (select id from doc_cronograma), dep.id, 'subjefe'::cargo_enum, 2 from dep where dep.nombre = 'Departamento de Auditorías Especiales'
union all
select (select id from doc_cronograma), dep.id, 'jefe'::cargo_enum, 3 from dep where dep.nombre = 'Departamento de Auditorías Especiales'
-- Memorando de Planificación y Cronograma: pasa por los 5 cargos, igual en los 3 departamentos.
union all
select (select id from doc_memorando), dep.id, 'auditor'::cargo_enum, 1 from dep
union all
select (select id from doc_memorando), dep.id, 'subjefe'::cargo_enum, 2 from dep
union all
select (select id from doc_memorando), dep.id, 'jefe'::cargo_enum, 3 from dep
union all
select (select id from doc_memorando), dep.id, 'subdirector'::cargo_enum, 4 from dep
union all
select (select id from doc_memorando), dep.id, 'director'::cargo_enum, 5 from dep;

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
