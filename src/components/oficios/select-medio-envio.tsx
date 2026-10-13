import { MEDIOS_ENVIO } from "@/lib/validations/oficio";

/**
 * Medio de envío del oficio. `<select>` nativo y no el Select de Base UI: mientras la lista tenga
 * una sola opción, el de Base UI puede no confirmar el valor al elegirla (ver `oficio-form.tsx`).
 */
export function SelectMedioEnvio({ id, defaultValue }: { id: string; defaultValue?: string | null }) {
  const valor = MEDIOS_ENVIO.find((m) => m === defaultValue) ?? MEDIOS_ENVIO[0];
  return (
    <select
      id={id}
      name="medio_envio"
      required
      defaultValue={valor}
      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
    >
      {MEDIOS_ENVIO.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}
