"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  BarChart3,
  Bell,
  ClipboardList,
  FileText,
  GraduationCap,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CARGO_LABELS, type Usuario } from "@/types/domain";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { href: "/actividades", label: "Actividades", icon: ClipboardList },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/oficios", label: "Oficios", icon: Mail },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/capacitaciones", label: "Capacitaciones", icon: GraduationCap },
  { href: "/recomendaciones", label: "Recomendaciones", icon: ListChecks },
];

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function Brand({ variant = "inline" }: { variant?: "inline" | "stacked" }) {
  // Dimensiones reales del PNG (no las del webp chico de antes): al pedirle a next/image el
  // ancho real, "stacked" puede renderizarlo grande (todo el ancho del sidebar) sin que se vea
  // borroso por upscaling.
  if (variant === "stacked") {
    return (
      <Link href="/actividades" className="flex flex-col items-center gap-2 px-6 py-6">
        <Image
          src="/minfin-logo-azul.png"
          alt="Ministerio de Finanzas Públicas"
          width={1280}
          height={421}
          priority
          className="h-auto w-full"
        />
      </Link>
    );
  }

  return (
    <Link href="/actividades" className="flex items-center gap-3">
      <Image
        src="/minfin-logo-azul.png"
        alt="Ministerio de Finanzas Públicas"
        width={1280}
        height={421}
        priority
        className="h-8 w-auto"
      />
    </Link>
  );
}

function NavRow({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
          : "text-sidebar-foreground/70 hover:translate-x-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

function SidebarNav({
  usuario,
  pathname,
  onNavigate,
}: {
  usuario: Usuario;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {NAV_ITEMS.map((item) => (
        <NavRow key={item.href} item={item} active={pathname.startsWith(item.href)} onNavigate={onNavigate} />
      ))}
      {usuario.permiso_sistema === "control_total" ? (
        <NavRow
          item={{ href: "/configuracion", label: "Configuración", icon: Settings }}
          active={pathname.startsWith("/configuracion")}
          onNavigate={onNavigate}
        />
      ) : null}
    </nav>
  );
}

export function AppShell({
  usuario,
  notificacionesNoLeidas,
  children,
}: {
  usuario: Usuario;
  notificacionesNoLeidas: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Cierra el drawer cuando cambia la ruta (incluye navegación por atrás/adelante del
  // navegador, no solo los clicks de NavRow) sin useEffect: ajustar estado en el propio
  // render, comparando contra la ruta anterior, es el patrón que React recomienda para esto.
  const [drawerPathname, setDrawerPathname] = useState(pathname);
  if (pathname !== drawerPathname) {
    setDrawerPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar de escritorio: fija, siempre visible desde lg. En mobile se reemplaza por el
       * drawer de abajo — mismo contenido, nunca dos fuentes de verdad para la navegación. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="border-b border-sidebar-border">
          <Brand variant="stacked" />
        </div>
        <SidebarNav usuario={usuario} pathname={pathname} />
      </aside>

      {/* Drawer mobile: mismo SidebarNav, dentro de un Dialog para foco/escape/scroll-lock
       * gratis en vez de reimplementar esa lógica a mano. */}
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 lg:hidden" />
          <DialogPrimitive.Popup className="fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[80%] flex-col bg-sidebar text-sidebar-foreground shadow-xl outline-none duration-200 data-open:animate-in data-open:slide-in-from-left data-open:fade-in-0 data-closed:animate-out data-closed:slide-out-to-left lg:hidden">
            <DialogPrimitive.Title className="sr-only">Menú de navegación</DialogPrimitive.Title>
            <div className="flex h-16 items-center justify-between px-4">
              <Brand />
              <DialogPrimitive.Close
                render={<Button variant="ghost" size="icon-sm" aria-label="Cerrar menú" />}
              >
                <X />
              </DialogPrimitive.Close>
            </div>
            <SidebarNav usuario={usuario} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur-sm supports-backdrop-filter:bg-background/80 lg:h-16 lg:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Abrir menú"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
          <div className="lg:hidden">
            <Brand />
          </div>
          {/* En desktop el sidebar ya lleva el logo — acá va el nombre institucional completo
           * del sistema, con la tipografía de encabezados y el navy de siempre (no un color
           * nuevo). Se oculta en mobile: no entra junto al logo compacto + campana + avatar. */}
          <p className="hidden min-w-0 flex-1 truncate font-heading text-lg font-semibold text-primary lg:block">
            Sistema de Control Interno Dirección de Auditoría Interna (SCIDAI)
          </p>
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="icon" aria-label="Notificaciones" render={<Link href="/notificaciones" />}>
              <span className="relative inline-flex">
                <Bell />
                {notificacionesNoLeidas > 0 ? (
                  <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-white ring-2 ring-background">
                    {notificacionesNoLeidas > 9 ? "9+" : notificacionesNoLeidas}
                  </span>
                ) : null}
              </span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1.5 transition-colors hover:bg-muted"
                    aria-label="Menú de usuario"
                  />
                }
              >
                <span className="hidden text-sm font-medium text-foreground sm:block">{usuario.nombre}</span>
                <Avatar>
                  <AvatarFallback>{iniciales(usuario.nombre)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Base UI exige que el GroupLabel viva dentro de un Menu.Group. */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium text-foreground">{usuario.nombre}</p>
                    {usuario.cargo ? <p className="text-xs text-muted-foreground">{CARGO_LABELS[usuario.cargo]}</p> : null}
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {/* El botón usa el atributo `form` (en vez de anidar un <form> dentro del
                 * Item) porque MenuItem le pone role="menuitem" al nodo raíz, y un <form> con
                 * ese rol no se activa por teclado de forma nativa. */}
                <DropdownMenuItem
                  variant="destructive"
                  render={<button type="submit" form="logout-form" className="flex w-full items-center gap-1.5" />}
                >
                  <LogOut />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <form id="logout-form" action={logout} className="hidden" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6 lg:p-8">{children}</main>

        <footer className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground">
            Dirección de Auditoría Interna · Ministerio de Finanzas Públicas
          </div>
        </footer>
      </div>
    </div>
  );
}
