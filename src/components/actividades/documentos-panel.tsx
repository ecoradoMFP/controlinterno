import {
  agregarDocumentoActividad,
  registrarMovimiento,
} from "@/app/(dashboard)/actividades/[id]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  CARGOS,
  CARGO_LABELS,
  FASE_DOCUMENTO_LABELS,
  TIPO_EVENTO_LABELS,
  type CargoEnum,
  type DocumentoActividad,
  type DocumentoCatalogo,
  type FaseDocumentoEnum,
} from "@/types/domain";

const FASES: FaseDocumentoEnum[] = ["elaboracion", "revision", "correccion", "finalizado"];

export function DocumentosPanel({
  actividadId,
  documentos,
  catalogoDisponible,
  ordenRevisionPorDocumento,
  puedeEditar,
}: {
  actividadId: string;
  documentos: (DocumentoActividad & { documentos_catalogo: Pick<DocumentoCatalogo, "nombre" | "etapa"> | null })[];
  catalogoDisponible: DocumentoCatalogo[];
  ordenRevisionPorDocumento: Map<string, string[]>;
  puedeEditar: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {documentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ningún documento del catálogo iniciado todavía.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {documentos.map((d) => (
            <div key={d.id} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{d.documentos_catalogo?.nombre ?? "Documento"}</p>
                  <p className="text-xs text-muted-foreground">
                    Responsable actual: {CARGO_LABELS[d.cargo_actual_responsable]}
                  </p>
                  {ordenRevisionPorDocumento.get(d.documento_catalogo_id) ? (
                    <p className="text-xs text-muted-foreground">
                      Orden de revisión sugerido:{" "}
                      {ordenRevisionPorDocumento
                        .get(d.documento_catalogo_id)!
                        .map((c) => CARGO_LABELS[c as CargoEnum])
                        .join(" → ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={d.fase_actual === "finalizado" ? "default" : "secondary"}>
                    {FASE_DOCUMENTO_LABELS[d.fase_actual]}
                  </Badge>
                  <Link
                    href={`/actividades/${actividadId}/hoja-de-ruta?documento=${d.id}`}
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Exportar hoja de ruta
                  </Link>
                </div>
              </div>

              {puedeEditar ? (
                <form action={registrarMovimiento} className="grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-4">
                  <input type="hidden" name="actividad_id" value={actividadId} />
                  <input type="hidden" name="documento_actividad_id" value={d.id} />

                  <MiniSelect name="de_cargo" label="De cargo" options={CARGOS} defaultValue={d.cargo_actual_responsable} />
                  <MiniSelect name="a_cargo" label="A cargo" options={CARGOS} required />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">Tipo de evento</label>
                    <Select name="tipo_evento" required items={TIPO_EVENTO_LABELS}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPO_EVENTO_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">Nueva fase (opcional)</label>
                    <Select name="nueva_fase" items={FASE_DOCUMENTO_LABELS}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Sin cambio" /></SelectTrigger>
                      <SelectContent>
                        {FASES.map((f) => (
                          <SelectItem key={f} value={f}>{FASE_DOCUMENTO_LABELS[f]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-3">
                    <label className="text-xs text-muted-foreground">Observación</label>
                    <Textarea name="observacion" rows={1} />
                  </div>
                  <Button type="submit" className="self-end">Registrar</Button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {puedeEditar && catalogoDisponible.length > 0 ? (
        <form
          action={agregarDocumentoActividad}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-4"
        >
          <input type="hidden" name="actividad_id" value={actividadId} />
          <div className="flex min-w-64 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Documento del catálogo</label>
            <Select
              name="documento_catalogo_id"
              required
              items={Object.fromEntries(catalogoDisponible.map((c) => [c.id, c.nombre]))}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona un documento" /></SelectTrigger>
              <SelectContent>
                {catalogoDisponible.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <MiniSelect name="cargo_actual_responsable" label="Responsable inicial" options={CARGOS} defaultValue="auditor" />
          <Button type="submit" variant="outline">Iniciar documento</Button>
        </form>
      ) : null}
    </div>
  );
}

function MiniSelect({
  name,
  label,
  options,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  options: CargoEnum[];
  defaultValue?: CargoEnum;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Select
        name={name}
        defaultValue={defaultValue}
        required={required}
        items={Object.fromEntries(options.map((c) => [c, CARGO_LABELS[c]]))}
      >
        <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {options.map((c) => (
            <SelectItem key={c} value={c}>{CARGO_LABELS[c]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
