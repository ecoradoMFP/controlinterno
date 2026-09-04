import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Botón de "volver" explícito en toda pantalla de detalle/formulario anidado: parte del
// personal que usa el sistema no está familiarizado con el botón "atrás" del navegador, así
// que la navegación de regreso debe ser visible dentro de la propia página, no implícita.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="outline" size="sm" render={<Link href={href} />}>
      <ArrowLeftIcon />
      {label}
    </Button>
  );
}
