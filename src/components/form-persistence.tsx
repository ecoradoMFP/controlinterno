"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { guardarFormulario, leerFormularioGuardado, olvidarFormulario, restaurarFormulario } from "@/lib/form-persistence";

export function FormPersistence() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    let observador: MutationObserver | undefined;
    let limite: ReturnType<typeof setTimeout> | undefined;
    const dejarDeVigilar = () => {
      observador?.disconnect();
      clearTimeout(limite);
    };
    const alEnviar = (e: SubmitEvent) => {
      if (!(e.target instanceof HTMLFormElement)) return;
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
      olvidarFormulario();
      return;
    }
    const temporizadores = [0, 150, 500].map((ms) => setTimeout(() => restaurarFormulario(entrada), ms));
    return () => temporizadores.forEach(clearTimeout);
  }, [pathname, search]);

  return null;
}
