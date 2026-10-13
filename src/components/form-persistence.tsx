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
    // Si el error se repite, el redirect cae en la MISMA URL (`?error=` idéntico) y el efecto de
    // abajo no vuelve a correr, pero React igual reemplaza el <form> por uno vacío. Por eso, tras
    // cada envío se vigila el DOM y, cuando el formulario enviado desaparece, se restaura.
    let observador: MutationObserver | undefined;
    let limite: ReturnType<typeof setTimeout> | undefined;
    const dejarDeVigilar = () => {
      observador?.disconnect();
      clearTimeout(limite);
    };
    const alEnviar = (e: SubmitEvent) => {
      if (!(e.target instanceof HTMLFormElement)) return;
      // FormAccion conserva lo escrito por su cuenta (no navega ni vacía el formulario).
      if (e.target.hasAttribute("data-sin-persistencia")) return;
      const enviado = e.target;
      guardarFormulario(enviado);
      dejarDeVigilar();
      observador = new MutationObserver(() => {
        if (enviado.isConnected) return;
        dejarDeVigilar();
        const entrada = leerFormularioGuardado();
        if (entrada) [0, 150, 500].forEach((ms) => setTimeout(() => restaurarFormulario(entrada), ms));
      });
      observador.observe(document.body, { childList: true, subtree: true });
      limite = setTimeout(dejarDeVigilar, 60_000);
    };
    document.addEventListener("submit", alEnviar, true);
    return () => {
      document.removeEventListener("submit", alEnviar, true);
      dejarDeVigilar();
    };
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
