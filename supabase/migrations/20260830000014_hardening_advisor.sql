-- Sección 12.9: hallazgos del advisor de seguridad de Supabase sobre las funciones trigger
-- de inmutabilidad (0008/0009). Ninguno afecta el comportamiento de los triggers en sí
-- (Postgres no revisa privilegios EXECUTE para invocar una función al dispararse un trigger),
-- pero cierran superficie de ataque innecesaria.

-- 1) search_path mutable: sin esta función no referencia tablas, pero se fija explícito por
-- consistencia con el resto de funciones del esquema.
alter function bloquear_update_delete_movimientos() set search_path = '';

-- 2) Ambas son funciones de tipo trigger (`returns trigger`) — Postgres las rechaza si se
-- invocan fuera de un trigger ("trigger functions can only be called as triggers"), pero por
-- defecto quedan como PUBLIC-executable y PostgREST las publica en /rest/v1/rpc/<nombre>.
-- Se revoca el EXECUTE explícito: nadie necesita llamarlas directamente.
revoke execute on function bloquear_update_delete_movimientos() from public, anon, authenticated;
revoke execute on function proteger_hechos_consumados_oficio() from public, anon, authenticated;
