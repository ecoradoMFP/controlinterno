# Manual del Director

> Antes de leer este capítulo, lee la [introducción](00-introduccion.md) — explica el semáforo, la
> bitácora, el flujograma y la hoja de ruta.

## Qué ves

Como Director ves **todo el sistema, sin restricción**: todas las actividades, documentos,
oficios y reportes de los tres departamentos y las dos subdirecciones, sin importar a cuál
pertenezcan. Eres además el único cargo que ve el enlace **Configuración** en el menú.

## Qué puedes hacer

Tienes los mismos permisos de captura que cualquier otro cargo (crear actividades, armar equipos,
registrar movimientos, cronograma, [cerrar etapas](03-manual-jefe.md#cerrar-una-etapa), oficios) —
el paso a paso de cada tarea es el mismo que en el [manual del Jefe](03-manual-jefe.md), solo que
tu alcance cubre todo el sistema en vez de un departamento o subdirección.

## Configuración (exclusivo de Dirección)

En **Configuración** administras dos cosas, ambas usadas por el motor de semáforo en todo el
sistema:

### Umbrales por ámbito

Hay tres filas — **Hitos de cronograma**, **Oficios**, **Actividad (general)** — cada una con tres
campos: **Verde ≥**, **Amarillo ≥** y **Naranja >**, expresados como porcentaje del plazo hábil
restante. Deben cumplir `verde > amarillo > naranja`; el sistema no te deja guardar un valor que
rompa ese orden. Cambia el número y presiona **Guardar** en esa fila — el cambio aplica de
inmediato a todo el sistema, no solo a nuevas actividades.

### Calendario de feriados

La tabla lista los feriados ya cargados (fecha y descripción) — estos días se excluyen del cálculo
de días hábiles en todo el sistema (cronograma, semáforo, cuellos de botella). Para eliminar uno,
presiona **Eliminar** en su fila. Para agregar uno nuevo, llena **Fecha** y **Descripción** al
final de la tabla y presiona **Agregar feriado**.

## El poder de corrección de Dirección (`es_correccion_direccion`)

El diseño del sistema (sección 12.5 de `prompt-maestro-trazabilidad-dai.md`) contempla que
Dirección pueda marcar un movimiento como **"corrección de Dirección"** — la única vía prevista
para alterar la narrativa de un expediente después del hecho, siempre con una observación
obligatoria y quedando resaltado en la bitácora con una etiqueta roja "Corrección de Dirección".

**Estado actual: esta función todavía no tiene un control en la pantalla.** El formulario para
registrar un movimiento (el mismo que usan Auditor, Subjefe y Jefe) no tiene ninguna casilla para
marcarlo como corrección de Dirección — aunque la base de datos ya está preparada para
recibirlo y para exigir la observación cuando se use. Si en el futuro se agrega ese control al
formulario, esta sección del manual debe actualizarse con el paso a paso real.

## Reportes

En **Reportes** ves el semáforo, mapa de calor de carga de trabajo, cuellos de botella, carga por
integrante y cumplimiento histórico de **todo el sistema** — la vista más completa disponible,
útil para comparar entre departamentos y subdirecciones.

## Exportar la hoja de ruta

Igual que los demás cargos: cada documento tiene su enlace **"Exportar hoja de ruta"**, y el
encabezado de la actividad tiene **"Exportar hoja de ruta completa"**. Ver la
[introducción](00-introduccion.md#el-flujograma-y-la-hoja-de-ruta).
