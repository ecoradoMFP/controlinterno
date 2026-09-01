import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COLOR_SEMAFORO_CLASSES, COLOR_SEMAFORO_LABELS, type ColorSemaforo } from "@/lib/semaforo";
import { marcarNotificacionLeida, marcarTodasLeidas } from "./actions";

export default async function NotificacionesPage() {
  const supabase = await createClient();

  // Sin filtro explícito: RLS (notificaciones_select) ya devuelve solo las del usuario actual.
  const { data: notificaciones } = await supabase
    .from("notificaciones")
    .select("id, actividad_id, color, mensaje, leido, created_at, actividades(no_nombramiento)")
    .order("created_at", { ascending: false })
    .limit(100);

  const hayNoLeidas = (notificaciones ?? []).some((n) => !n.leido);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Alertas de semáforo (sección 9): se generan cuando una actividad dentro de tu alcance
            entra o cambia a naranja/rojo, vía el job diario.
          </p>
        </div>
        {hayNoLeidas ? (
          <form action={marcarTodasLeidas}>
            <Button variant="outline" size="sm" type="submit">
              Marcar todas como leídas
            </Button>
          </form>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {notificaciones && notificaciones.length > 0 ? (
          notificaciones.map((n) => (
            <div
              key={n.id}
              className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${n.leido ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <Badge className={COLOR_SEMAFORO_CLASSES[n.color as ColorSemaforo]}>
                  {COLOR_SEMAFORO_LABELS[n.color as ColorSemaforo]}
                </Badge>
                <div>
                  <Link href={`/actividades/${n.actividad_id}`} className="text-sm font-medium hover:underline">
                    {n.mensaje}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </div>
              {!n.leido ? (
                <form action={marcarNotificacionLeida}>
                  <input type="hidden" name="id" value={n.id} />
                  <Button variant="ghost" size="sm" type="submit">
                    Marcar leída
                  </Button>
                </form>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No tienes notificaciones todavía.</p>
        )}
      </div>
    </div>
  );
}
