import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/nav/app-shell";
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
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-lg font-semibold">Su cuenta aún no está vinculada</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Su acceso fue autenticado correctamente, pero todavía no existe un perfil de usuario
          (NIT, cargo, permisos) asociado. Comuníquese con Dirección o al administrador del sistema
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
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("Su cuenta está desactivada.")}`);
  }

  const supabase = await createClient();
  const { count: notificacionesNoLeidas } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("leido", false);

  return (
    <AppShell usuario={usuario} notificacionesNoLeidas={notificacionesNoLeidas ?? 0}>
      {children}
    </AppShell>
  );
}
