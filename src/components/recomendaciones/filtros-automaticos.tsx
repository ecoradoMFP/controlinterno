"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function FiltrosAutomaticos({
  ruta,
  className,
  children,
}: {
  ruta: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  function aplicar(form: HTMLFormElement) {
    const params = new URLSearchParams();
    for (const [clave, valor] of new FormData(form)) {
      if (typeof valor === "string" && valor) params.set(clave, valor);
    }
    const qs = params.toString();
    empezar(() => router.replace(qs ? `${ruta}?${qs}` : ruta, { scroll: false }));
  }

  return (
    <form
      method="get"
      action={ruta}
      aria-busy={pendiente}
      className={cn(pendiente && "opacity-80", className)}
      onSubmit={(e) => {
        e.preventDefault();
        aplicar(e.currentTarget);
      }}
      onChange={(e) => {
        const form = e.currentTarget;
        const campo = e.target as HTMLElement;
        if (campo instanceof HTMLInputElement && campo.type === "text") {
          if (temporizador.current) clearTimeout(temporizador.current);
          temporizador.current = setTimeout(() => aplicar(form), 400);
        } else {
          aplicar(form);
        }
      }}
    >
      {children}
    </form>
  );
}
