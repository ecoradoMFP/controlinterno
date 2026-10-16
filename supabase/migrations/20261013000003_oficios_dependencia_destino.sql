alter table oficios add column dependencia_destino text;

update oficios o
set dependencia_destino = a.dependencia_auditada
from actividades a
where o.actividad_id = a.id and o.dependencia_destino is null;
