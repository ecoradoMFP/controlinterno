-- Dependencia a la que va dirigido el oficio. Independiente de la auditoría relacionada: hay
-- oficios que piden información a una dependencia que no es objeto de la auditoría (o que no
-- tienen auditoría), así que no se deriva de `actividades.dependencia_auditada`. Se guarda el
-- NOMBRE de la unidad como texto (foto histórica, mismo criterio que actividades/informes).
-- Nullable solo por los oficios ya registrados; el formulario la exige en los nuevos.
alter table oficios add column dependencia_destino text;

-- Los oficios existentes ligados a una auditoría casi siempre iban a la dependencia auditada:
-- se toma como valor inicial para no dejarlos en blanco.
update oficios o
set dependencia_destino = a.dependencia_auditada
from actividades a
where o.actividad_id = a.id and o.dependencia_destino is null;
