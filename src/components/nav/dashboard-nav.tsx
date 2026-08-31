"use client";

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

export function DashboardNav({ usuario }: { usuario: Usuario }) {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold">DAI · Trazabilidad</span>
          <nav className="flex items-center gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm text-muted-foreground hover:text-foreground",
                  pathname.startsWith(item.href) && "font-medium text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {usuario.nombre}
            {usuario.cargo ? ` · ${CARGO_LABELS[usuario.cargo]}` : null}
          </span>
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit">
              Salir
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
