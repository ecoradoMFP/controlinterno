"use client";

import { useState } from "react";
import { Check, Copy, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Muestra la ruta de un archivo o carpeta del expediente digital con un botón para copiarla.
 * El navegador no puede abrir rutas de red (\\servidor\...) desde una página web, así que lo
 * útil hoy es copiarla y pegarla en el Explorador de archivos.
 */
export function RutaExpediente({ ruta, etiqueta }: { ruta: string | null; etiqueta?: string }) {
  const [copiada, setCopiada] = useState(false);

  if (!ruta) {
    return <p className="text-xs text-muted-foreground">{etiqueta ? `${etiqueta}: ` : ""}sin ruta registrada</p>;
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(ruta!);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 1500);
    } catch {
      // Sin permiso de portapapeles (contexto no seguro): la ruta sigue visible para copiarla a mano.
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <FolderOpen className="size-3.5 shrink-0" aria-hidden />
      {etiqueta ? <span className="shrink-0">{etiqueta}:</span> : null}
      <code className="truncate rounded bg-muted px-1.5 py-0.5" title={ruta}>
        {ruta}
      </code>
      <Button type="button" variant="ghost" size="icon-sm" onClick={copiar} aria-label="Copiar ruta">
        {copiada ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
}
