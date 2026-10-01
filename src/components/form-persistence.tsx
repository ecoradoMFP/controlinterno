"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { guardarFormulario, leerFormularioGuardado, olvidarFormulario, restaurarFormulario } from "@/lib/form-persistence";

/**
 * Conserva lo que el usuario escribió cuando un formulario falla: al enviarlo guarda sus valores y,
 * si la página regresa con `?error=`, los vuelve a poner. Se monta una vez en el layout raíz.
 */
export function FormPersistence() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    const alEnviar = (e: SubmitEvent) => {
      if (e.target instanceof HTMLFormElement) guardarFormulario(e.target);
    };
    document.addEventListener("submit", alEnviar, true);
    return () => document.removeEventListener("submit", alEnviar, true);
  }, []);

  useEffect(() => {
    const entrada = leerFormularioGuardado();
    if (!entrada) {
      // Navegación normal (envío exitoso u otra página): no dejar valores viejos.
      olvidarFormulario();
      return;
    }
    // React reinicia los formularios al terminar la acción: se reintenta un par de veces.
    const temporizadores = [0, 150, 500].map((ms) => setTimeout(() => restaurarFormulario(entrada), ms));
    return () => temporizadores.forEach(clearTimeout);
  }, [pathname, search]);

  return null;
}
