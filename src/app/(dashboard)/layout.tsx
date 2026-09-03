import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/nav/dashboard-nav";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioActual();

  if (!usuario) {
    // Sesión válida de Supabase Auth pero sin perfil de negocio vinculado (sección 12.4: el
    // alta de usuarios es un flujo administrativo, no un CRUD de aplicación). No es un error
    // del usuario, así que se explica en vez de solo redirigir de vuelta a /login.
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-lg font-semibold">Tu cuenta aún no está vinculada</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tu acceso fue autenticado correctamente, pero todavía no existe un perfil de usuario
          (NIT, cargo, permisos) asociado. Contacta a Dirección o al administrador del sistema
          para completar el alta.
        </p>
        <form action={logout}>
          <Button variant="outline" type="submit">
            Cerrar sesión
          </Button>
        </form>
      </div>
    );
  }

  if (!usuario.activo) {
    // Sesión de Supabase Auth vigente pero usuario desactivado en `usuarios`: se cierra la
    // sesión explícitamente en vez de solo redirigir, para no dejarlo "autenticado" en el
    // limbo con una sesión que ningún flujo de la app va a honrar.
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("Tu cuenta está desactivada.")}`);
  }

  const supabase = await createClient();
  const { count: notificacionesNoLeidas } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("leido", false);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <DashboardNav usuario={usuario} notificacionesNoLeidas={notificacionesNoLeidas ?? 0} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-6">{children}</main>
      <footer className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-white/70">
          Dirección de Auditoría Interna · Ministerio de Finanzas Públicas
        </div>
      </footer>
    </div>
  );
}
