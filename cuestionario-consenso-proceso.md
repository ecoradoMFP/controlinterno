
Este cuestionario recoge los puntos donde el sistema hoy asume un comportamiento genérico que
puede no coincidir con el proceso real. El objetivo es llegar a consenso en reunión y ajustar el
modelo de datos/UI en consecuencia. 

---

1. Naturaleza de cada uno de los 18 ítems del catálogo

El sistema modela **todos** los ítems del catálogo igual: se "inician", pasan por
`elaboración → entrega → revisión → corrección → finalizado`, con un responsable que cambia de
cargo en cada paso y queda registrado en bitácora. Para cada ítem, confirmar si esto aplica o no.

Para cada fila: **¿es un entregable que se entrega/revisa entre cargos, o es trabajo/gestión
interna del auditor (o del jefe/subjefe) sin ciclo de revisión?**

### Planificación
| # | Documento | ¿Tiene ciclo de entrega/revisión? | Notas / quién revisa |
|---|---|---|---|
| 1 | Cronograma proyectado | | |
| 2 | Conocimiento y Comprensión del Área | *(ver pregunta específica abajo)* | |
| 3 | Requerimiento de Información | | |
| 4 | Elaboración de Matriz de Evaluación de Riesgos y Controles | | |
| 5 | Cuestionario de Control Interno | | |
| 6 | Ponderación de la Matriz de Evaluación | | |
| 7 | Gestión de Áreas (Muestreo y Asignación de Áreas) | | |
| 8 | Programa de Auditoría | | |
| 9 | Memorando de Planificación y Cronograma | | |

### Realización del Trabajo (Ejecución)
| # | Documento | ¿Tiene ciclo de entrega/revisión? | Notas / quién revisa |
|---|---|---|---|
| 10 | Requerimiento de Documentos a verificar en la Muestra | | |
| 11 | PT Cédula Centralizadora | | |
| 12 | PT Cédula Sumaria, Analítica, Atributos Sistema | | |
| 13 | PT Cédula General | | |

### Comunicación de Resultados
| # | Documento | ¿Tiene ciclo de entrega/revisión? | Notas / quién revisa |
|---|---|---|---|
| 14 | Determinación de deficiencias | | |
| 15 | Elaboración de Conclusiones preliminares (Deficiencias) | | |
| 16 | Notificación de Conclusiones preliminares (Deficiencias) | | |
| 17 | Análisis de Respuestas | | |
| 18 | Elaboración y Conclusión final (Informe de Auditoría) | | |

---

2. Conocimiento y Comprensión del Área (#2) — detalle

Es el período en que el auditor se familiariza con la dirección/entidad que será auditada. 
Preguntas puntuales:

1. ¿Produce algún registro escrito (nota, resumen, bitácora propia) o es puramente un período de
   trabajo sin entregable?
2. Si hay algo escrito, ¿alguien más lo revisa o aprueba (Subjefe/Jefe), o el auditor solo lo
   archiva/conserva?
3. ¿Debe quedar marcado como "completado" (con fecha) antes de poder cerrar Planificación, igual
   que hoy exige el sistema para los documentos del catálogo? ¿O es informativo y no debería
   bloquear el cierre de etapa?
4. ¿Qué información mínima tiene sentido registrar en el sistema para este paso — solo fecha de
   inicio/fin, o algo más (por ejemplo normativa revisada, personas contactadas)?

---

3. Gestión de Áreas — Muestreo y Asignación de Áreas (#7) — detalle

Sospecha similar al punto 2: parece una tarea de gestión interna (el Jefe/Subjefe decide quién
audita qué área) más que un documento que el Auditor elabora y entrega para revisión.

1. ¿Quién realiza esta actividad — el Auditor, el Subjefe, o el Jefe?
2. ¿Genera un documento formal (una tabla de asignación, por ejemplo) o es una decisión que se
   comunica verbalmente/por correo y no necesita quedar como "documento" en el sistema?
3. Si genera un documento, ¿ese documento pasa por revisión de alguien más, o solo se registra?

---

4. Matriz de revisión completa (documento × departamento × cargo)

El sistema ya sabe que esta matriz **no es uniforme** — varía por documento y por departamento
(ejemplo ya documentado: "Cronograma proyectado" lo revisa el Jefe en Especiales y Administrativas
pero no en Financieras). Hoy solo hay 2 de 18 documentos sembrados como ejemplo; el resto está
pendiente de importar del Excel fuente (`DOCUMENTOS_QUE_SE_GENERAN_EN_EL_CAI`).

**Acción:** revisar juntos el Excel que ya tenés y confirmar:
1. Que las ~15 columnas de marcas por documento coinciden con la estructura esperada
   (`documento × departamento × cargo`).
2. El **orden de revisión** dentro de cada documento (quién revisa primero, segundo, etc.) —
   necesario para el hint de "orden de revisión sugerido" que hoy solo existe para 2 de 18
   documentos.
3. Si hay excepciones o casos especiales no capturables en una tabla simple (por ejemplo, un
   documento que a veces sí y a veces no pasa por cierto cargo, dependiendo del caso).

---

5. Corrección de Dirección (`es_correccion_direccion`)

El diseño contempla que Dirección pueda marcar un movimiento como "corrección de Dirección" (para
registrar tardíamente o corregir después del hecho, con observación obligatoria) — la base de
datos ya lo soporta pero no hay control en pantalla todavía.

1. ¿Con qué frecuencia se necesita esto en la práctica real?
2. ¿Es solo para registros tardíos (algo pasó pero no se capturó a tiempo), o también para
   corregir información ya capturada incorrectamente?
3. Prioridad: ¿bloqueante para adopción, o puede esperar a una siguiente iteración?

---

6. Espacio para otros hallazgos de la reunión

- **Cronograma → Documentos, ¿autocarga?** Un hito del cronograma puede enlazarse opcionalmente a
  un documento del catálogo (`documento_catalogo_id`), pero hoy ese enlace es solo informativo:
  "iniciar" el documento en la pestaña Documentos sigue siendo un paso manual aparte. ¿Debería
  agregarse automáticamente a Documentos al guardar el hito? Ojo: la regla de negocio actual solo
  permite iniciar un documento si su etapa coincide con la etapa actual de la actividad (no se
  puede iniciar un documento de Ejecución mientras la actividad sigue en Planificación) — si el
  cronograma se carga completo desde el inicio (hitos de todas las etapas), autocargar rompería
  esa regla para los hitos de etapas futuras. Definir: ¿autocargar solo cuando el hito es de la
  etapa actual, o dejarlo manual como está?

---

7. Resuelto en sesión 2026-09-18 (a partir de `REVISIONES POR DOCUMENTO.xlsx`)

- **Punto 4 (matriz completa) — importada.** Los 18 documentos × 3 departamentos × cargo ya
  están en `documentos_catalogo_revision` (migración `20260918000001_matriz_revision_documentos.sql`).
  Hallazgo: la matriz estandarizada **no varía por departamento** — mismo flujo en Especiales,
  Financieras y Administrativas para los 18 documentos (antes se asumía que sí variaba, ver el
  ejemplo de Cronograma proyectado documentado en el prompt maestro sección 4.5, que quedó
  desactualizado: Jefe ya no revisa Cronograma proyectado en ningún departamento).
- **Documentos #16 y #18 del archivo fuente (Notificación de Conclusiones preliminares y
  Análisis de Respuestas)** — confirmado: en Especiales también pasan por Subjefe y Jefe,
  igual que en los otros 2 departamentos (el Excel entregado los traía sin marcar ahí).
- **Orden de revisión** — se deriva de la posición de columna en el Excel (Auditor → Subjefe →
  Jefe → Subdirector → Director, siempre en ese orden), no requiere dato manual aparte.
- **Regla de corrección** — confirmado: una devolución para corrección siempre regresa a
  Auditor, nunca a un cargo intermedio. Implementado en la UI (`movimiento-form-fields.tsx`):
  al elegir tipo de evento "Devolución para corrección", el campo "A cargo" se fija
  automáticamente en Auditor (ya no hay que elegirlo a mano).
- **Visto bueno fuera del flujo estándar** — confirmado que las autoridades (Subdirector/
  Director) deben poder marcar visto bueno en un documento aunque su cargo no esté en la
  matriz de ese documento. Verificado que **ya funciona sin cambios**: `registrarMovimiento`
  no restringe `a_cargo`/`de_cargo` contra la matriz, cualquier cargo puede registrar un
  movimiento en cualquier documento.
- **Asistentes (captura_delegada)** — confirmado que el mecanismo ya diseñado
  (`permiso_sistema = captura_delegada`, sección 4.9/12.5 del prompt maestro) cubre este caso;
  no se requiere diseño nuevo.
- **Verificado en navegador (sesión 2026-09-18, continuación).** Migración aplicada en remoto
  (confirmado por consulta directa: 18 documentos × 3 departamentos = 186 filas en
  `documentos_catalogo_revision`) y en local (`supabase db reset` + `poblar-demo.mjs`).
  Probado en `/actividades/[id]` pestaña Documentos con NAI-001-2026 (Cronograma proyectado):
  (a) al elegir "Devolución para corrección" el campo "A cargo" se fija en "Auditor
  (automático)" y queda deshabilitado; al cambiar a otro tipo de evento vuelve a ser un select
  editable — funciona como se esperaba. (b) "Orden de revisión sugerido: Auditor → Subjefe"
  para Cronograma proyectado, reflejando la matriz nueva (ya no incluye Jefe). (c) Se registró
  un movimiento "Aprobación · Director → Subdirector" (ninguno de los dos cargos está en la
  matriz de este documento) y quedó en la bitácora sin ningún bloqueo — confirma que el visto
  bueno fuera del flujo estándar funciona sin cambios de código. Los 3 puntos quedan cerrados.

---

8. Pendiente (anotado 2026-09-18, sin implementar): días hábiles automáticos + renombrar
   "feriados" → "asuetos"

Al cargar un hito del cronograma, hoy `dias_habiles_esperados` es un campo numérico que el
usuario **tipea a mano** (`cronograma-panel.tsx:129`), aunque ya captura
`fecha_inicio_esperada` y `fecha_fin_esperada` en el mismo formulario, y el componente ya
recibe el set de feriados (`feriados: ReadonlySet<string>`, usado hoy solo para el semáforo).
Pedido: calcularlo automático a partir de esas dos fechas, excluyendo fines de semana y los
"asuetos" — sin pedirle ese número al usuario.

Además: renombrar el concepto "feriados" a "asuetos" en todo el sistema (tabla
`calendario_feriados`, tipo/variables `feriados` en `cronograma-panel.tsx`,
`src/lib/bi.ts`, `configuracion/page.tsx` y `configuracion/actions.ts`, y cualquier label en
pantalla) — es el término correcto que usa DAI, no "feriados".

Para la próxima sesión: (1) confirmar si el cálculo debe ser 100% automático (sin poder
editarlo a mano) o autocompletado-pero-editable por si hay una excepción real; (2) decidir si
el rename de "feriados"→"asuetos" se hace solo en UI/nombres de variable o también en el
nombre de la tabla/columnas de base de datos (impacto en migraciones ya aplicadas).

---

9. Pendiente (anotado 2026-09-18, sin implementar): renombrar "Actividades" → "Auditorías
   (CAI)", y nombramientos flexibles de Coordinador/Supervisor

- **Rename "Actividades" → "Auditorías (CAI)".** Hoy el módulo, las rutas
  (`/actividades`, `/actividades/[id]`, `/actividades/nueva`), la tabla `actividades` y
  `actividades_equipo`, y las etiquetas en pantalla usan "Actividad". Pendiente decidir
  alcance: ¿solo texto visible en UI, o también nombres de tabla/rutas? (nombres de
  tabla/rutas son más costosos de cambiar por todas las referencias en RLS, `database.ts`
  generado, y enlaces existentes).
- **Coordinador = Subjefe, Supervisor = Jefe.** Son los nombres reales de los puestos; el
  sistema hoy usa `cargo_enum` con las etiquetas "Subjefe"/"Jefe" (`CARGO_LABELS` en
  `src/types/domain.ts`). Falta confirmar si esto es solo un cambio de etiqueta visible
  (`CARGO_LABELS`) o si "Coordinador"/"Supervisor" deben ser el nombre oficial en todos lados
  (documentos exportados, hoja de ruta, etc.) manteniendo `cargo_enum` como está internamente.
- **El campo debe ser flexible — nombramientos temporales.** Motivo: acaba de pasar en la
  práctica real (una suspensión que se cubrió con una "ampliación de nombramiento", es decir,
  alguien asumió temporalmente el puesto de Coordinador/Supervisor). Hoy `usuarios.cargo` es
  un atributo fijo por usuario (una sola cargo_enum, gestionado solo por Dirección, sin
  historial ni vigencia) — no hay forma de reflejar "esta persona actúa como Jefe del
  10/sept al 30/oct mientras dure la ampliación" sin cambiarle el cargo permanentemente y
  luego revertirlo a mano (se pierde el rastro de que fue temporal).
  **Para la próxima sesión, decidir el modelo:** ¿nombramientos con vigencia
  (`usuario_nit, cargo, fecha_inicio, fecha_fin`, posiblemente por departamento) que se
  consulten en vez de/además de `usuarios.cargo`? ¿O sigue siendo edición manual de
  `usuarios.cargo` pero se acepta el riesgo de que quede sin registro histórico?

---

10. Pendiente (anotado 2026-09-18, sin implementar): fecha de recibido de nombramiento y de
    Declaración de Independencia deben poder cambiarse, dejando motivo

Ya existen en el sistema (`actividades_equipo.fecha_recibido` y
`.fecha_declaracion_independencia`, ver `equipo-panel.tsx`) — hoy cada miembro del equipo
marca esas dos fechas **una sola vez**: en cuanto `fecha` tiene valor, el campo pasa a ser de
solo lectura (`ConfirmacionCampo`, `equipo-panel.tsx:137-143`), sin opción de corregirla ni
campo de observación/motivo en absoluto (ni siquiera al capturarla la primera vez).

Pedido: permitir cambiar la fecha después de registrada, pero dejando marca de que hubo un
cambio y anotación obligatoria del motivo — mismo espíritu que `es_correccion_direccion` en
`movimientos` (sección 12.5: nunca sobrescribir en silencio, motivo obligatorio, visible en
la bitácora).

**Para la próxima sesión, decidir el modelo:** ¿se convierte en un log de eventos como
`movimientos` (cada cambio de fecha es una fila nueva con motivo, la vigente es la más
reciente), o alcanza con agregar 1-2 columnas a `actividades_equipo` (algo como
`fecha_recibido_motivo_cambio` / un `updated_at` + observación) dado que en la práctica esto
cambia rara vez? ¿Quién puede hacer el cambio — el mismo integrante, o requiere cargo
superior (como `control_total`)?

-
-
