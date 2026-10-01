// Los formularios de la app son Server Actions que, ante un error, hacen `redirect(...?error=...)`:
// la página vuelve a pintarse y los campos quedan vacíos. Para no obligar a reescribir lo que ya
// se había capturado, al enviar cualquier formulario se guardan sus valores en sessionStorage y,
// si la página vuelve con `?error=`, se restauran (ver FormPersistence y el componente Select).
// Las contraseñas, archivos y campos ocultos nunca se guardan.

const CLAVE = "scidai:form-enviado";
const VIGENCIA_MS = 5 * 60_000;

export type FormularioGuardado = {
  ruta: string;
  indice: number;
  ts: number;
  valores: Record<string, string[]>;
};

type CampoFormulario = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function camposRestaurables(form: HTMLFormElement): CampoFormulario[] {
  return [...form.elements].filter((el): el is CampoFormulario => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return false;
    if (!el.name || el.name.startsWith("$ACTION")) return false;
    if (el instanceof HTMLInputElement && ["password", "file", "hidden", "submit", "button"].includes(el.type)) return false;
    return true;
  });
}

export function guardarFormulario(form: HTMLFormElement) {
  try {
    const valores: Record<string, string[]> = {};
    for (const el of camposRestaurables(form)) {
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        valores[el.name] ??= [];
        if (el.checked) valores[el.name].push(el.value);
      } else {
        valores[el.name] = [...(valores[el.name] ?? []), el.value];
      }
    }
    // Los dropdowns (base-ui) publican su valor en un input oculto con el mismo name; el
    // componente Select los restaura por su cuenta, así que sus valores se guardan aquí. Los
    // ocultos NO se restauran en el DOM (restaurarFormulario los ignora).
    for (const el of form.querySelectorAll<HTMLInputElement>('input[type="hidden"][name]')) {
      if (!el.name.startsWith("$ACTION") && !(el.name in valores)) valores[el.name] = [el.value];
    }
    const indice = [...document.forms].indexOf(form);
    const entrada: FormularioGuardado = { ruta: location.pathname, indice, ts: Date.now(), valores };
    sessionStorage.setItem(CLAVE, JSON.stringify(entrada));
  } catch {
    // sessionStorage no disponible: simplemente no se restaura.
  }
}

/** Entrada vigente para ESTA página y solo cuando volvió con un error. */
export function leerFormularioGuardado(): FormularioGuardado | null {
  try {
    if (!new URLSearchParams(location.search).has("error")) return null;
    const crudo = sessionStorage.getItem(CLAVE);
    if (!crudo) return null;
    const entrada = JSON.parse(crudo) as FormularioGuardado;
    if (entrada.ruta !== location.pathname || Date.now() - entrada.ts > VIGENCIA_MS) return null;
    return entrada;
  } catch {
    return null;
  }
}

export function olvidarFormulario() {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {}
}

export function valorGuardado(name: string): string | undefined {
  return leerFormularioGuardado()?.valores[name]?.[0];
}

/** Rellena (sin pisar lo que el usuario ya haya vuelto a escribir) el formulario que falló. */
export function restaurarFormulario(entrada: FormularioGuardado) {
  const form = document.forms[entrada.indice];
  if (!form) return;
  for (const el of camposRestaurables(form)) {
    const guardado = entrada.valores[el.name];
    if (!guardado) continue;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      el.checked = guardado.includes(el.value);
    } else if (el.value === "") {
      el.value = guardado[0] ?? "";
    }
  }
}
