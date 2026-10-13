"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ResultadoAccion } from "@/lib/actions/resultado";

export type { ResultadoAccion };

const PendienteContext = createContext(false);

/**
 * Formulario que llama a una Server Action SIN navegar: la acción hace `revalidatePath` y la página
 * se actualiza en su lugar, sin saltar arriba ni cerrar lo que estaba abierto (a diferencia del
 * `redirect(...)` de siempre, que es una navegación completa).
 *
 * - Si sale bien, el formulario se vuelve a montar vacío (o con los nuevos valores por defecto) y, si
 *   estaba dentro de un `<details>` (correcciones, "+ Agregar"), este se pliega, salvo con
 *   `mantenerAbierto` (formularios para agregar varios seguidos).
 * - Si falla, el error se muestra aquí mismo y lo escrito se conserva: se envía con `onSubmit` y no
 *   con `action`, porque React vacía los formularios con `action` al terminar, aunque haya error.
 *   Por eso también queda fuera de FormPersistence (`data-sin-persistencia`).
 */
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
        // Con el `submitter`, el name/value del botón pulsado viaja igual que en un envío normal
        // (p. ej. accion=aprobar|devolver).
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

/** Botón de envío de un `FormAccion`: se deshabilita y avisa mientras la acción se procesa. */
export function BotonAccion({ children, ...props }: React.ComponentProps<typeof Button>) {
  const pendiente = useContext(PendienteContext);
  return (
    <Button {...props} type="submit" disabled={pendiente || props.disabled}>
      {pendiente ? "Guardando…" : children}
    </Button>
  );
}
