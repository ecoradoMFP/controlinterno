alter function bloquear_update_delete_movimientos() set search_path = '';

revoke execute on function bloquear_update_delete_movimientos() from public, anon, authenticated;
revoke execute on function proteger_hechos_consumados_oficio() from public, anon, authenticated;
