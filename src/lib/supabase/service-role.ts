import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Sección 12.2: cliente con `SUPABASE_SERVICE_ROLE_KEY`, que bypassea RLS por completo. Uso
 * reservado a tareas administrativas server-only explícitamente identificadas como tales — hoy
 * únicamente el job diario de alertas de semáforo (`/api/cron/semaforo`, sección 9), que por
 * diseño necesita ver todas las actividades de los 3 departamentos para decidir a quién avisar,
 * no solo el alcance de un usuario autenticado.
 *
 * Nunca importar este módulo desde código que corre en el navegador ni desde una Server Action
 * que resuelve una operación de un usuario — ese camino siempre es `createClient` de
 * `./server.ts`, dejando que RLS decida.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
