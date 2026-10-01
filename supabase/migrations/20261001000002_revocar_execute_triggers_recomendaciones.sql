-- Funciones de trigger SECURITY DEFINER del módulo de recomendaciones: solo las invoca el
-- trigger, no deben poder llamarse como RPC (/rest/v1/rpc/...) por anon ni authenticated.
revoke execute on function public.recomendaciones_actualizar_estado() from public, anon, authenticated;
revoke execute on function public.seguimientos_recomendacion_asignar_numero() from public, anon, authenticated;
