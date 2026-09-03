"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { CARGO_LABELS, type Usuario } from "@/types/domain";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/actividades", label: "Actividades" },
  { href: "/documentos", label: "Documentos" },
  { href: "/oficios", label: "Oficios" },
  { href: "/reportes", label: "Reportes" },
] as const;

// Mismo tono que usa minfin.gob.gt para resaltar el ítem de navegación activo sobre el navy del
// header — no es parte del theme de shadcn porque solo aplica sobre este fondo oscuro puntual.
const NAV_ACTIVE_CLASS = "text-[#7fd4f2]";

export function DashboardNav({
  usuario,
  notificacionesNoLeidas,
}: {
  usuario: Usuario;
  notificacionesNoLeidas: number;
}) {
  const pathname = usePathname();

  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/actividades" className="flex items-center gap-3">
            <Image
              src="/minfin-logo-blanco.webp"
              alt="Ministerio de Finanzas Públicas"
              width={171}
              height={56}
              priority
              className="h-8 w-auto"
            />
            <span className="hidden border-l border-white/25 pl-3 text-xs font-semibold tracking-wider text-white/80 uppercase sm:block">
              DAI · Trazabilidad
            </span>
          </Link>
          <nav className="flex items-center gap-5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium text-white/70 transition-colors hover:text-white",
                  pathname.startsWith(item.href) && NAV_ACTIVE_CLASS,
                )}
              >
                {item.label}
              </Link>
            ))}
            {usuario.permiso_sistema === "control_total" ? (
              <Link
                href="/configuracion"
                className={cn(
                  "text-sm font-medium text-white/70 transition-colors hover:text-white",
                  pathname.startsWith("/configuracion") && NAV_ACTIVE_CLASS,
                )}
              >
                Configuración
              </Link>
            ) : null}
            <Link
              href="/notificaciones"
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white",
                pathname.startsWith("/notificaciones") && NAV_ACTIVE_CLASS,
              )}
            >
              Notificaciones
              {notificacionesNoLeidas > 0 ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff6500] px-1 text-[10px] font-semibold text-white">
                  {notificacionesNoLeidas > 99 ? "99+" : notificacionesNoLeidas}
                </span>
              ) : null}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-white/70 sm:block">
            {usuario.nombre}
            {usuario.cargo ? ` · ${CARGO_LABELS[usuario.cargo]}` : null}
          </span>
          <form action={logout}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="border border-white/25 text-white hover:bg-white/10 hover:text-white"
            >
              Salir
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
