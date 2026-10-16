"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ResultadoAccion } from "@/lib/actions/resultado";

export type { ResultadoAccion };

const PendienteContext = createContext(false);

export function FormAccion({
  action,
  className,
  mantenerAbierto = false,
  children,
}: {
  action: (formData: FormData) => Promise<ResultadoAccion>;
  className?: string;
  mantenerAbierto?: boolean;
  children: React.ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [pendiente, startTransition] = useTransition();

  return (
    <form
      key={version}
      data-sin-persistencia=""
      aria-busy={pendiente}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (pendiente) return;
        const form = e.currentTarget;
        const datos = new FormData(form, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(async () => {
          const resultado = await action(datos);
          if (resultado?.error) {
            setError(resultado.error);
          } else {
            setError(null);
            if (!mantenerAbierto) form.closest("details")?.removeAttribute("open");
            setVersion((v) => v + 1);
          }
        });
      }}
    >
      {error ? (
        <p role="alert" className="col-span-full w-full rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <PendienteContext.Provider value={pendiente}>{children}</PendienteContext.Provider>
    </form>
  );
}

export function BotonAccion({ children, ...props }: React.ComponentProps<typeof Button>) {
  const pendiente = useContext(PendienteContext);
  return (
    <Button {...props} type="submit" disabled={pendiente || props.disabled}>
      {pendiente ? "Guardando…" : children}
    </Button>
  );
}
