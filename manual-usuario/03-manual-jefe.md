# Manual del Jefe

> Antes de leer este capítulo, lee la [introducción](00-introduccion.md) — explica el semáforo, la
> bitácora, el flujograma y la hoja de ruta.

## Qué ves

Como Jefe ves **todas las actividades de tu departamento**, igual que el Subjefe — no solo las
tuyas. Lo mismo aplica a Documentos, Oficios y Reportes.

No ves el enlace **Configuración** — es exclusivo de Dirección.

## Crear una actividad

1. Ve a **Actividades → Nueva actividad**.
2. El campo **Departamento** ya viene fijo al tuyo (no se puede cambiar).
3. Completa:
   - **No. de nombramiento** (ej. `NAI-003-2026`).
   - **Auditor principal** — selecciónalo de la lista (incluye a cualquier integrante del
     departamento, no solo a quienes tienen cargo "Auditor").
   - **Dependencia auditada**, **Tipo de auditoría** (texto libre, ej. "Financiera").
   - **Período evaluado** (inicio y fin), **Inicio de plazo**, **Fecha de notificación**.
   - **Expedientes relacionados** (opcional).
4. Presiona **Crear actividad**. Entras directo al detalle de la nueva actividad, en la pestaña
   **Equipo**.

## Armar el equipo

En la pestaña **Equipo**, elige un **Usuario** de la lista, opcionalmente su **Rol en el equipo**
(texto libre, ej. "apoyo"), y presiona **Agregar**. Repite para cada integrante (por ejemplo, el
Subjefe y el o los Auditores que van a trabajar la actividad).

## Documentos y correcciones

Igual que el Subjefe: cuando un documento llega a tu cargo, decides si lo apruebas/avanzas
(**Aprobación**, **A cargo** al siguiente responsable, **Nueva fase = Finalizado** cuando
corresponde) o si lo devuelves (**Devolución para corrección**, con la observación de qué hay que
arreglar). Ver el [manual del Subjefe](02-manual-subjefe.md#revisar-un-documento-y-devolverlo-o-aprobarlo)
para el detalle paso a paso — es el mismo formulario para cualquier cargo.

## Cronograma

En la pestaña **Cronograma** de una actividad:

- **Agregar un hito**: llena Código (ej. `1.1`), Nombre del hito, Etapa (Planificación /
  Ejecución / Comunicación de Resultados), Responsable, Inicio esperado, Fin esperado, Días
  hábiles, y opcionalmente el Documento del catálogo que produce ese hito. Presiona **Agregar
  hito**.
- **Marcar un hito concluido**: en la tarjeta del hito, indica su **Fecha real de conclusión** y
  presiona **Marcar concluido**. El color de semáforo del hito se recalcula solo, comparando esa
  fecha contra la fecha esperada.

## Cerrar una etapa

Cuando todos los documentos y hitos de la etapa actual ya están finalizados/concluidos (y, si es
Planificación, todo el equipo confirmó su recibido y Declaración de Independencia), aparece
habilitado el botón **"Cerrar etapa → [siguiente etapa]"** en el encabezado de la actividad.
Presiónalo para avanzar. Si todavía falta algo, el sistema te muestra abajo del botón un aviso con
lo que falta ("Faltan 2 documento(s)...") y, si igual lo intentas, un mensaje explicando
exactamente por qué no se pudo. Ver el detalle de la regla en la
[introducción](00-introduccion.md#las-4-etapas-de-una-actividad).

## Crear un oficio

1. Ve a **Oficios → Nuevo oficio**.
2. Completa:
   - **No. de oficio** (ej. `DAI-AF-003-2026`).
   - **Actividad relacionada** (opcional, pero recomendado si el oficio pertenece a una
     auditoría).
   - **Destinatario** y, opcionalmente, **Puesto del destinatario**.
   - **Asunto**.
   - **Fecha de emisión**.
   - **Medio de envío** (opcional, texto libre: "Correo", "físico", etc.).
   - **Plazo de respuesta en días** y/o **Fecha de vencimiento** (opcionales).
   - **Observaciones** (opcional).
3. Presiona **Crear oficio**. Entras al detalle del oficio, en la pestaña **Seguimiento**.

### Registrar el seguimiento de un oficio

En la pestaña **Seguimiento** hay tres bloques, uno por hecho:

- **Envío** — fecha de envío y medio; botón **Registrar envío**.
- **Recepción** — fecha de recepción; botón **Registrar recepción**.
- **Respuesta** — número de respuesta (opcional), fecha de respuesta; botón **Registrar
  respuesta**.

Una vez registrado un hecho, el botón cambia a **Corregir** — si necesitas corregir una fecha ya
registrada, el sistema te pide escribir una observación explicando por qué, para que quede
trazable.

### Revisores y firmantes

En la pestaña **Revisores y firmantes** del oficio puedes agregar, por separado, quién lo revisa y
quién lo firma: elige el usuario de la lista y presiona **Agregar** en cada bloque.

## Reportes

En **Reportes** ves, para tu alcance (tu departamento): el resumen de semáforo por actividad, el
**mapa de calor** de carga de trabajo por departamento (cada columna — actividades activas,
documentos pendientes, oficios pendientes — se colorea de claro a oscuro según su propio máximo),
cuellos de botella (tiempo real que un documento pasa en cada cargo), carga de trabajo por
integrante, cumplimiento histórico de plazos, y la comparación entre días planeados y reales por
etapa.

## Exportar la hoja de ruta

Igual que los demás cargos: cada documento tiene su enlace **"Exportar hoja de ruta"**, y el
encabezado de la actividad tiene **"Exportar hoja de ruta completa"**. Ver la
[introducción](00-introduccion.md#el-flujograma-y-la-hoja-de-ruta).
