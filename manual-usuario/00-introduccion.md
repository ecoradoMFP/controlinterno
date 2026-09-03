# Introducción al sistema

## Qué es

El Sistema de Trazabilidad Documental digitaliza el seguimiento de las auditorías que realiza la
Dirección de Auditoría Interna (DAI): quién tiene cada documento en cada momento, si los plazos
del cronograma se están cumpliendo, y el estado de los oficios enviados a las entidades
auditadas. Reemplaza el seguimiento manual en Excel.

## Cómo iniciar sesión

1. Entra a la dirección del sistema. Verás la pantalla **"Dirección de Auditoría Interna — Sistema
   de Trazabilidad Documental"**, con una banda azul marino y el logotipo del Ministerio de
   Finanzas Públicas arriba.
2. Escribe tu **correo institucional** (formato `nombre.apellido@minfin.gob.gt`) y tu
   **contraseña**.
3. Presiona **Ingresar**.

Si tu cuenta fue autenticada pero todavía no tiene un perfil de usuario vinculado (NIT, cargo,
permisos), el sistema te lo indica en pantalla — eso es un trámite administrativo, no un error
tuyo; contacta a Dirección o al administrador del sistema.

Para salir, usa el botón **Salir** en la esquina superior derecha, junto a tu nombre y cargo.

## El menú principal

Arriba de cada pantalla hay una barra de navegación azul marino con el logo, y a la derecha tu
nombre y cargo. Los enlaces que ves dependen de tu cargo — por ejemplo, **Configuración** solo la
ven las personas con el permiso más alto (ver el capítulo del Director). Los enlaces típicos son:
**Actividades**, **Documentos**, **Oficios**, **Reportes**, **Notificaciones** (con un número
naranja si tienes alertas sin leer).

## Qué es una "actividad"

Una actividad es una auditoría concreta — tiene un número de nombramiento (por ejemplo
`NAI-001-2026`), un departamento responsable, un auditor principal, un tipo de auditoría
(Financiera, Operativa, etc.), fechas de período evaluado, inicio de plazo y notificación. Dentro
de cada actividad hay cuatro pestañas: **Equipo**, **Cronograma**, **Documentos** y **Bitácora**.

## Las 4 etapas de una actividad

Toda actividad avanza por 4 etapas fijas, siempre en este orden, sin poder saltarse ninguna ni
retroceder: **Planificación → Ejecución → Comunicación de Resultados → Expediente / Cierre**. Lo
verás como una etiqueta junto al número de nombramiento, y como el botón **"Cerrar etapa →
[siguiente etapa]"** en el encabezado de la actividad.

El sistema exige que la etapa actual esté realmente terminada antes de dejarte cerrarla — si lo
intentas antes de tiempo, te dice exactamente qué falta:

- **Todos los documentos** del catálogo que pertenecen a esa etapa y que ya se iniciaron deben
  estar en fase **"Finalizado"**.
- **Todos los hitos** del cronograma de esa etapa deben estar **"Concluido"**.
- Solo para cerrar **Planificación**: todo el equipo de la actividad debe haber confirmado su
  **recibido del nombramiento** y su **Declaración de Independencia** (ver más abajo) — es el
  primer paso real del proceso, antes de cualquier trabajo de gabinete.

Mientras la actividad está en una etapa, el sistema tampoco te deja iniciar documentos que
pertenezcan a una etapa posterior — por ejemplo, no puedes iniciar un documento de Ejecución si la
actividad todavía sigue en Planificación. El desplegable de "Documento del catálogo" en la pestaña
Documentos solo te ofrece los que sí corresponden a la etapa actual.

Cada cierre de etapa queda registrado de forma permanente — quién lo hizo y cuándo — visible en la
pestaña **Bitácora**, sección "Cierres de etapa".

## Recibido del nombramiento y Declaración de Independencia

Antes de que cualquier integrante del equipo empiece a trabajar una auditoría, el proceso real
exige que confirme dos cosas: que **recibió el nombramiento**, y que firmó su **Declaración de
Independencia** (no tiene conflicto de interés con la entidad auditada). En la pestaña **Equipo**
de la actividad, junto a cada integrante, hay dos campos de fecha con sus botones — cada quien
(o quien capture en su nombre) indica la fecha y presiona **"Recibido del nombramiento"** o
**"Declaración de Independencia"**. Una vez confirmado, se muestra como una etiqueta con la fecha
en vez del formulario.

## El semáforo

El semáforo es la forma en que el sistema resume, con un color, si una actividad, un hito de
cronograma o un oficio van bien o mal respecto a su plazo. Se calcula automáticamente — nadie lo
asigna a mano — según cuánto plazo hábil le queda al vencer. Los cuatro colores son:

| Color | Texto en el sistema | Significado |
|---|---|---|
| Verde | **Vamos bien** | Va dentro de lo esperado |
| Amarillo | **Va apretado** | Queda poco margen |
| Naranja | **En riesgo** | El margen es mínimo |
| Rojo | **No se logra** | Ya venció o no se va a cumplir |

Lo verás como una etiqueta rectangular con un punto de color (por ejemplo
🔴 **NO SE LOGRA**) en las listas de actividades, oficios, hitos y en Reportes. El semáforo de una
*actividad* es siempre el peor color entre sus hitos y oficios todavía abiertos — nunca un
promedio, y una actividad sin hitos ni oficios capturados todavía simplemente no tiene semáforo
("Sin datos").

Cuando una actividad dentro de tu alcance entra o cambia a naranja o rojo, el sistema genera una
alerta automática una vez al día — la verás en **Notificaciones**.

## La bitácora (quién tuvo cada documento, y cuándo)

Cada vez que alguien registra un movimiento sobre un documento (una entrega, una recepción, una
aprobación, una devolución para corrección, o un registro tardío), esa fila queda guardada de
forma permanente — nadie puede editarla ni borrarla después, ni siquiera Dirección. Si algo se
registró mal, la corrección se hace con un movimiento nuevo, nunca borrando el anterior. Esa es la
pestaña **Bitácora** dentro de cada actividad: la lista completa y cronológica de todo lo que pasó
con los documentos de esa auditoría.

## El flujograma y la "hoja de ruta"

Un documento casi nunca avanza en línea recta: se entrega, se revisa, a veces se devuelve para
corrección, se vuelve a entregar, y así hasta que se aprueba. Para que ese vaivén se vea de un
vistazo (no solo leyendo la lista larga de movimientos), cada documento tiene un **flujograma**:
una cadena de cargos conectados por flechas — gris con `→` para un paso normal (Entrega,
Recepción, Aprobación), y **roja con `↩`** para una devolución para corrección, que es la única
que mueve el documento hacia atrás.

La **hoja de ruta** es la versión exportable/imprimible de todo esto: el encabezado de la
actividad, y para cada documento su flujograma seguido del detalle cronológico completo (fecha,
tipo de evento, de qué cargo a qué cargo, quién lo registró, y la observación si la escribieron).
Se puede exportar de dos formas:

- **De un solo documento** — botón **"Exportar hoja de ruta"** junto a ese documento, en la
  pestaña Documentos de la actividad.
- **De la actividad completa** (todos sus documentos) — enlace **"Exportar hoja de ruta
  completa"** en el encabezado de la actividad.

En la página que se abre, presiona **"Imprimir / Guardar como PDF"** y usa la opción de imprimir
de tu navegador para guardarla como PDF — no hace falta ningún programa adicional.

## Los cargos

El sistema tiene cinco cargos, cada uno con un alcance distinto de lo que puede ver: **Auditor**
(solo sus actividades asignadas), **Subjefe** y **Jefe** (todo su departamento), **Subdirector**
(todos los departamentos de su subdirección) y **Director** (todo el sistema, sin excepción). El
capítulo correspondiente a tu cargo explica en detalle qué ves y qué puedes hacer.
