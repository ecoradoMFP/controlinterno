import { registrarEnvio, registrarRecepcion, registrarRespuesta } from "@/app/(dashboard)/oficios/[id]/actions";
import { PasosCiclo, type PasoCiclo } from "@/components/recomendaciones/pasos-ciclo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Oficio } from "@/types/domain";

/** "2026-03-26" → "26/03/2026" */
const fecha = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : null);

type Paso = "envio" | "recepcion" | "respuesta" | "completo";

/**
 * Seguimiento de un oficio en el orden en que ocurre: emitido → enviado → recibido → respondido.
 * Arriba, en qué paso va; luego, UN solo formulario (el del paso que sigue); abajo, lo ya
 * registrado como consulta. Una fecha ya registrada solo la corrige control total (mismo límite
 * que el trigger `oficios_proteger_hechos_consumados`), y esa corrección va plegada.
 */
export function SeguimientoOficio({
  oficio,
  puedeEditar,
  puedeCorregir,
}: {
  oficio: Oficio;
  puedeEditar: boolean;
  puedeCorregir: boolean;
}) {
  const paso: Paso = !oficio.fecha_envio
    ? "envio"
    : !oficio.fecha_recepcion
      ? "recepcion"
      : !oficio.fecha_respuesta
        ? "respuesta"
        : "completo";
  const indice = { envio: 1, recepcion: 2, respuesta: 3, completo: 4 }[paso];
  const estado = (n: number): PasoCiclo["estado"] => (n < indice ? "hecho" : n === indice ? "actual" : "pendiente");
  const pasos: PasoCiclo[] = [
    { titulo: "Emitido", detalle: fecha(oficio.fecha_emision), estado: "hecho" },
    { titulo: "Enviado", detalle: fecha(oficio.fecha_envio) ?? "Pendiente", estado: estado(1) },
    { titulo: "Recibido", detalle: fecha(oficio.fecha_recepcion) ?? "Pendiente", estado: estado(2) },
    { titulo: "Respondido", detalle: fecha(oficio.fecha_respuesta) ?? "Pendiente", estado: estado(3) },
  ];

  const titulo = {
    envio: "Registrar el envío del oficio",
    recepcion: "Registrar la recepción en la dependencia",
    respuesta: "Registrar la respuesta de la dependencia",
    completo: "Oficio respondido",
  }[paso];

  return (
    <div className="flex flex-col gap-6">
      <PasosCiclo pasos={pasos} etiqueta="Avance del oficio" />

      <Card id="siguiente-paso" className={cn("scroll-mt-4", paso !== "completo" && "border-primary/40")}>
        <CardHeader className="gap-1">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            {paso === "completo" ? "Estado" : "Siguiente paso"}
          </p>
          <CardTitle className="text-base">{titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          {paso === "completo" ? (
            <p className="text-muted-foreground">
              La dependencia respondió el {fecha(oficio.fecha_respuesta)}
              {oficio.no_respuesta ? ` con el documento ${oficio.no_respuesta}` : ""}. No queda nada pendiente.
            </p>
          ) : !puedeEditar ? (
            <p className="text-muted-foreground">Usted puede consultar este oficio, pero no registrar su seguimiento.</p>
          ) : paso === "envio" ? (
            <FormEnvio oficio={oficio} />
          ) : paso === "recepcion" ? (
            <FormRecepcion oficio={oficio} />
          ) : (
            <FormRespuesta oficio={oficio} />
          )}
        </CardContent>
      </Card>

      {oficio.fecha_envio ? (
        <section className="flex flex-col gap-3 rounded-xl border p-4">
          <h3 className="font-medium">Lo registrado</h3>
          <ul className="flex flex-col gap-3">
            <Registro
              titulo="Envío"
              texto={`El ${fecha(oficio.fecha_envio)}${oficio.medio_envio ? `, por ${oficio.medio_envio}` : ""}`}
              correccion={puedeCorregir ? <FormEnvio oficio={oficio} correccion /> : null}
            />
            {oficio.fecha_recepcion ? (
              <Registro
                titulo="Recepción"
                texto={`El ${fecha(oficio.fecha_recepcion)}`}
                correccion={puedeCorregir ? <FormRecepcion oficio={oficio} correccion /> : null}
              />
            ) : null}
            {oficio.fecha_respuesta ? (
              <Registro
                titulo="Respuesta"
                texto={`El ${fecha(oficio.fecha_respuesta)}${oficio.no_respuesta ? `, documento ${oficio.no_respuesta}` : ""}`}
                correccion={puedeCorregir ? <FormRespuesta oficio={oficio} correccion /> : null}
              />
            ) : null}
          </ul>
          {oficio.observaciones ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Observaciones: </span>
              {oficio.observaciones}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Registro({ titulo, texto, correccion }: { titulo: string; texto: string; correccion: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2 border-b pb-3 last:border-b-0 last:pb-0">
      <p>
        <span className="font-medium">{titulo}:</span> {texto}
      </p>
      {correccion ? (
        <details>
          <summary className="cursor-pointer text-sm text-primary">Corregir (solo Dirección)</summary>
          <div className="mt-3">{correccion}</div>
        </details>
      ) : null}
    </li>
  );
}

function FormEnvio({ oficio, correccion }: { oficio: Oficio; correccion?: boolean }) {
  return (
    <form action={registrarEnvio} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="oficio_id" value={oficio.id} />
      <Campo label="Fecha de envío" htmlFor={`fecha_envio${correccion ? "_c" : ""}`}>
        <Input id={`fecha_envio${correccion ? "_c" : ""}`} name="fecha_envio" type="date" defaultValue={oficio.fecha_envio ?? ""} required />
      </Campo>
      <Campo label="Medio de envío (opcional)" htmlFor={`medio_envio${correccion ? "_c" : ""}`}>
        <Input id={`medio_envio${correccion ? "_c" : ""}`} name="medio_envio" defaultValue={oficio.medio_envio ?? ""} placeholder="Ej. correo, mensajería" />
      </Campo>
      {correccion ? <MotivoCorreccion id="motivo_envio" /> : null}
      <Button type="submit" size={correccion ? "default" : "lg"} variant={correccion ? "outline" : "default"}>
        {correccion ? "Guardar corrección" : "Registrar envío"}
      </Button>
    </form>
  );
}

function FormRecepcion({ oficio, correccion }: { oficio: Oficio; correccion?: boolean }) {
  return (
    <form action={registrarRecepcion} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="oficio_id" value={oficio.id} />
      <Campo label="Fecha en que la dependencia lo recibió" htmlFor={`fecha_recepcion${correccion ? "_c" : ""}`}>
        <Input id={`fecha_recepcion${correccion ? "_c" : ""}`} name="fecha_recepcion" type="date" defaultValue={oficio.fecha_recepcion ?? ""} required />
      </Campo>
      {correccion ? <MotivoCorreccion id="motivo_recepcion" /> : null}
      <Button type="submit" size={correccion ? "default" : "lg"} variant={correccion ? "outline" : "default"}>
        {correccion ? "Guardar corrección" : "Registrar recepción"}
      </Button>
    </form>
  );
}

function FormRespuesta({ oficio, correccion }: { oficio: Oficio; correccion?: boolean }) {
  const s = correccion ? "_c" : "";
  return (
    <form action={registrarRespuesta} className="flex flex-col gap-3">
      <input type="hidden" name="oficio_id" value={oficio.id} />
      <div className="flex flex-wrap items-end gap-3">
        <Campo label="Fecha de la respuesta" htmlFor={`fecha_respuesta${s}`}>
          <Input id={`fecha_respuesta${s}`} name="fecha_respuesta" type="date" defaultValue={oficio.fecha_respuesta ?? ""} required />
        </Campo>
        <Campo label="No. del documento de respuesta (opcional)" htmlFor={`no_respuesta${s}`}>
          <Input id={`no_respuesta${s}`} name="no_respuesta" defaultValue={oficio.no_respuesta ?? ""} />
        </Campo>
      </div>
      {correccion ? (
        <MotivoCorreccion id="motivo_respuesta" />
      ) : (
        <Campo label="Observaciones (opcional)" htmlFor="observaciones">
          <Textarea id="observaciones" name="observaciones" defaultValue={oficio.observaciones ?? ""} />
        </Campo>
      )}
      <Button type="submit" size={correccion ? "default" : "lg"} variant={correccion ? "outline" : "default"} className="w-fit">
        {correccion ? "Guardar corrección" : "Registrar respuesta"}
      </Button>
    </form>
  );
}

/** Toda corrección de una fecha ya registrada queda en las observaciones del oficio, con su motivo. */
function MotivoCorreccion({ id }: { id: string }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <Label htmlFor={id}>Motivo de la corrección (obligatorio, queda en las observaciones)</Label>
      <Textarea id={id} name="motivo_correccion" required minLength={10} rows={2} />
    </div>
  );
}

function Campo({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-56 flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
