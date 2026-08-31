# PROMPT MAESTRO — Sistema de Trazabilidad Documental y BI
### Dirección de Auditoría Interna (DAI) — Ministerio de Finanzas Públicas, Guatemala

Actúa como un agente de desarrollo full-stack senior. Vas a diseñar y construir un sistema web interno para digitalizar el control de auditorías de la Dirección de Auditoría Interna (DAI) del Ministerio de Finanzas Públicas (MINFIN). Hoy este control se lleva en Excel (matrices manuales por departamento) y en papel (registros de recepción/entrega). El objetivo NO es solo digitalizar: es dar **trazabilidad documental completa** (quién tiene qué, desde cuándo, y si va a tiempo) y **BI de desempeño** (cuellos de botella, carga de trabajo, cumplimiento de plazos) que hoy es imposible de obtener de forma confiable.

---

## 1. Contexto institucional

**Estructura organizacional (fija, no configurable en el MVP):**

```
Director
├── Subdirector de Auditorías Financieras, Administrativas y de Procesos
│   ├── Departamento de Auditorías Financieras (DAF)
│   └── Departamento de Auditorías Administrativas y de Procesos (DAAP)
└── Subdirector de Auditorías Especiales
    └── Departamento de Auditorías Especiales (DAE)
```

Son **exactamente 2 subdirectores** en toda la Dirección — el primero cubre 2 departamentos, el segundo cubre 1. Este mapeo es fijo y debe estar hardcodeado/seedado, no inventado como "1 subdirector por departamento".

**Cargos jerárquicos** (dimensión que impulsa trazabilidad y BI — corresponde al campo "Responsable" de la matriz de control actual):
`Auditor → Subjefe → Jefe → Subdirector → Director`

Cada persona con cargo Auditor/Subjefe/Jefe pertenece a **un** departamento. Cada Subdirector pertenece a **una** subdirección (que agrupa 1 o 2 departamentos). El Director ve todo.

**Volumen:** ~50 usuarios en total entre los 3 departamentos.

---

## 2. Alcance del MVP

**Dentro de alcance:**
- Un único tipo de actividad: **Auditoría** (de Cumplimiento y Financiera, Operativa, etc. — el subtipo es texto libre por ahora, no un catálogo cerrado).
- Trazabilidad completa del ciclo de vida de cada documento generado durante una auditoría.
- Registro de oficios/correspondencia con plazos de respuesta.
- Motor de semáforo (on track / apretado / en riesgo / no se logra) a nivel de hito, documento, oficio, y actividad.
- Dashboards y métricas BI.
- Bitácora inmutable de todos los movimientos.

**Fuera de alcance del MVP (va para v2):**
- Otros tipos de actividad administrativa: Seguimiento de Recomendaciones (CAI/CUA), Consultorías, Dictamen de Baja, Opinión, Informe, Seguimiento de Fideicomisos, Notificación de Conclusiones como actividad independiente. (Estos ya están identificados en el catálogo "Estado de Avance" de la matriz actual, así que el modelo de datos debe dejar espacio para agregarlos sin rediseñar, pero **no se construyen ahora**.)
- Módulo de seguimiento de recomendaciones (nace de una auditoría cerrada, pero es su propio subsistema).
- Carga inicial / migración de las auditorías que ya están en curso en la matriz Excel actual — **el sistema arranca en cero**, la matriz actual se sigue llevando en paralelo hasta que termine el ciclo de las auditorías ya iniciadas.
- Canal definitivo de notificaciones externas (ver sección 9 — queda como decisión abierta con opciones).
- Catálogo de tipos de actividad configurable por el usuario (por ahora es fijo, definido por el desarrollador).

---

## 3. Stack técnico

- **Frontend/Backend:** Next.js (App Router), TypeScript en modo estricto.
- **Base de datos y auth:** Supabase (Postgres + Supabase Auth + Row Level Security).
- **UI:** Tailwind CSS + shadcn/ui.
- **Estado cliente:** Zustand.
- **Gráficas/BI:** Recharts.
- **Deploy:** Vercel.
- **Gestor de paquetes:** pnpm.

Nota para el agente: existe un plan a futuro de migrar a infraestructura Azure institucional, pero **no diseñes en función de esa migración** — mantén el esquema de datos razonablemente portable (SQL estándar, evitar features muy propietarias de Supabase salvo RLS) pero construye el MVP completo sobre este stack sin bloquearte esperando esa decisión.

---

## 4. Modelo de datos

### 4.1 `departamentos`
`id, nombre` (Auditorías Financieras / Auditorías Administrativas y de Procesos / Auditorías Especiales), `subdireccion_id`

### 4.2 `subdirecciones`
`id, nombre, subdirector_nit` — seed con los 2 registros fijos de la sección 1.

### 4.3 `usuarios`
`nit` (PK, identificador único), `nombre`, `puesto`, `correo`, `departamento_id` (nullable — el personal no jerárquico, ej. asistente de archivo, puede no tener uno fijo), `cargo` (enum: `auditor | subjefe | jefe | subdirector | director | null`), `permiso_sistema` (enum — ver 4.9), `activo` (bool).

### 4.4 `actividades` (auditorías)
`id, no_nombramiento` (único, formato `NAI-XXX-AAAA` observado en los nombramientos reales), `departamento_id`, `auditor_principal_nit`, `dependencia_auditada`, `tipo_auditoria` (texto libre), `periodo_evaluado_inicio/fin`, `fecha_inicio_plazo`, `fecha_notificacion` (fecha límite del nombramiento, ambas vienen de "Plazo establecido" en la matriz actual), `etapa_actual` (enum: `planificacion | ejecucion | comunicacion_resultados | expediente_cierre`), `expedientes_relacionados` (array de texto — referencias a oficios/correspondencia relacionada, como ya se registra hoy), `created_at`.

Tabla puente `actividades_equipo` (`actividad_id, usuario_nit, rol_en_equipo`) para los casos de auditorías con más de un auditor asignado (ya ocurre en los datos reales).

### 4.5 `documentos_catalogo` (maestro, unificado para los 3 departamentos — dato semilla, no lo inventes: ver 4.5.1)
`id, etapa` (`planificacion | ejecucion | comunicacion_resultados`), `orden, nombre, observaciones`.

### 4.5.1 Catálogo real a sembrar (18 documentos, ya unificado desde el archivo `DOCUMENTOS_QUE_SE_GENERAN_EN_EL_CAI`)

| Etapa | # | Documento |
|---|---|---|
| Planificación de la Auditoría | 1 | Cronograma proyectado |
| | 2 | Conocimiento y Comprensión del Área |
| | 3 | Requerimiento de Información |
| | 4 | Elaboración de Matriz de Evaluación de Riesgos y Controles |
| | 5 | Cuestionario de Control Interno |
| | 6 | Ponderación de la Matriz de Evaluación |
| | 7 | Gestión de Áreas (Muestreo y Asignación de Áreas) |
| | 8 | Programa de Auditoría |
| | 9 | Memorando de Planificación y Cronograma |
| Realización del Trabajo | 10 | Requerimiento de Documentos a verificar en la Muestra |
| | 11 | PT Cédula Centralizadora |
| | 12 | PT Cédula Sumaria, Analítica, Atributos Sistema |
| | 13 | PT Cédula General |
| Comunicación de Resultados | 14 | Determinación de deficiencias |
| | 15 | Elaboración de Conclusiones preliminares (Deficiencias) |
| | 16 | Notificación de Conclusiones preliminares (Deficiencias) |
| | 17 | Análisis de Respuestas |
| | 18 | Elaboración y Conclusión final (Informe de Auditoría) |

*(Nota: el archivo fuente numera estos dos últimos como 18 y 19, saltando el 17 — aquí quedan renumerados de forma secuencial 1-18.)*

**Importante — matriz de revisión NO es uniforme.** El ciclo de revisión (qué cargos revisan cada documento) varía por documento **y** por departamento; no es una cadena fija de 5 pasos para todo. Dos ejemplos reales para que la lógica del importador tenga sentido:

- *Cronograma proyectado*: lo elabora el Auditor y revisa Subjefe en los 3 departamentos, pero el Jefe solo revisa en Especiales y Administrativas — **no** en Financieras. No pasa por Subdirector ni Director.
- *Memorando de Planificación y Cronograma*: pasa por los 5 cargos (Auditor → Subjefe → Jefe → Subdirector → Director) en los 3 departamentos por igual.

Esta matriz completa (documento × departamento × cargo requerido) debe importarse tal cual del archivo Excel fuente que se te va a entregar como seed — no la retranscribas a mano, ya que tiene ~15 columnas de marcas por cada una de las 18 filas y el riesgo de error de transcripción es alto. Tabla resultante: `documentos_catalogo_revision (documento_catalogo_id, departamento_id, cargo, orden_revision)`.

### 4.6 `hitos_cronograma`
`id, actividad_id, etapa, codigo_jerarquico` (texto, ej. `"1.7.1"` — los cronogramas reales usan numeración jerárquica de hasta 3 niveles), `nombre, fecha_inicio_esperada, fecha_fin_esperada, dias_habiles_esperados, cargo_responsable, documento_catalogo_id` (nullable — se vincula cuando ese hito produce un entregable formal del catálogo), `fecha_fin_real` (nullable), `estado` (`pendiente | en_curso | concluido`).

Esta tabla es el resultado de sistematizar el "Cronograma proyectado" (documento #1 del catálogo): en vez de quedar como archivo adjunto estático, se captura como datos estructurados al cerrar Planificación, y es la fuente de fechas que alimenta el semáforo.

### 4.7 `documentos_actividad` (instancia real de un documento del catálogo dentro de una auditoría específica)
`id, actividad_id, documento_catalogo_id, hito_id` (nullable), `fase_actual` (enum: `elaboracion | revision | correccion | finalizado` — estas 4 fases ya existen como convención en el archivo fuente), `cargo_actual_responsable, created_at`.

### 4.8 `movimientos` (bitácora inmutable del ciclo de revisión)
`id, documento_actividad_id, de_cargo, a_cargo, tipo_evento` (`entrega | recepcion | aprobacion | devolucion_correccion | registro_tardio`), `timestamp` (generado en servidor, nunca editable), `observacion, registrado_por_nit` (quién hizo clic — relevante cuando alguien registra en nombre de otro), `es_correccion_direccion` (bool).

Regla de diseño (ya validada): esto es un **log de eventos**, no columnas fijas de "ciclo 1 / ciclo 2 / ciclo 3". Un documento puede rebotar entre Elaboración y Corrección tantas veces como sea necesario y cada rebote es simplemente una fila más. Las correcciones/registros tardíos de Dirección se agregan como movimiento nuevo marcado `es_correccion_direccion=true`; **nunca sobrescriben el evento original**.

### 4.9 `usuarios.permiso_sistema` (dimensión de permisos, independiente del cargo)
- `captura_propia`: registra sus propios movimientos (Auditor, Subjefe, Jefe, Subdirector, Director todos necesitan esto para dejar su propio paso en la cadena).
- `captura_delegada`: puede registrar movimientos en nombre de otro usuario (rol tipo asistente/secretaria de departamento); queda registrado quién lo hizo vía `registrado_por_nit`.
- `consulta`: solo lectura.
- `control_total`: además de todo lo anterior, puede hacer registro tardío y correcciones. Reservado para Dirección.

### 4.10 `oficios` (correspondencia)
`id, actividad_id` (nullable), `no_oficio` (formato observado: `DAI-[DEPTO]-XXX-AAAA`), `fecha_emision, destinatario, puesto_destinatario, asunto, responsable_elaboracion_nit`, `revisores` (puente a usuarios), `firmantes` (puente a usuarios), `medio_envio, fecha_envio, fecha_recepcion, plazo_respuesta_dias, fecha_vencimiento, no_respuesta, fecha_respuesta, observaciones`.

### 4.11 `parametros_semaforo`
`id, ambito` (`hito | oficio | actividad`), `umbral_verde_pct, umbral_amarillo_pct, umbral_naranja_pct` — **no hardcodear los umbrales**, deben ser configurables (ver sección 5).

### 4.12 `calendario_feriados`
`fecha, descripcion` — los cronogramas reales excluyen asuetos (Día del Ejército, Independencia, Semana Santa, aniversario de MINFIN/DAI, etc.) del cálculo de días hábiles. Sembrar con un calendario editable, no calcular solo sábados/domingos.

---

## 5. Motor de semáforo

Para cualquier hito u oficio **abierto** (sin fecha de conclusión/respuesta):

```
dias_habiles_totales      = días hábiles entre fecha_inicio_esperada y fecha_fin_esperada
                             (excluyendo fines de semana y calendario_feriados)
dias_habiles_transcurridos = días hábiles entre fecha_inicio_esperada y hoy
dias_habiles_restantes     = dias_habiles_totales - dias_habiles_transcurridos
pct_restante                = dias_habiles_restantes / dias_habiles_totales
```

Niveles por defecto (parametrizables en `parametros_semaforo`, no hardcodeados):

| Semáforo | Condición |
|---|---|
| 🟢 Verde — "vamos bien" | `pct_restante ≥ 50%` |
| 🟡 Amarillo — "va apretado" | `25% ≤ pct_restante < 50%` |
| 🟠 Naranja — "en riesgo" | `0% < pct_restante < 25%` |
| 🔴 Rojo — "no se logra" | `pct_restante ≤ 0%` (plazo vencido sin concluir) |

Para hitos/oficios **ya concluidos**: no llevan semáforo activo, se guarda `cumplido_a_tiempo = fecha_fin_real ≤ fecha_fin_esperada` como dato histórico para BI de cumplimiento.

**A nivel de actividad completa:** el semáforo es el **peor caso** (el más cercano a rojo) entre todos sus hitos/documentos/oficios abiertos en ese momento — es la lectura más conservadora y la más útil para control interno. No promediar.

**Métrica complementaria (no es semáforo, pero alimenta el mismo BI de cuellos de botella):** días en poder del responsable actual, calculado directamente de los timestamps de `movimientos` — de ahí sale el "¿dónde se está atorando esto?" por cargo, departamento y tipo de documento.

---

## 6. Reglas de negocio clave

1. **Procesos paralelos dentro de una etapa.** Una etapa puede tener varios `documentos_actividad` activos simultáneamente, cada uno en su propia fase y con su propio responsable. El estado de la actividad **no** es un único valor manual — se deriva del conjunto de sus documentos/hitos activos.
2. **Transición de etapa.** Una actividad avanza de etapa cuando todos los documentos obligatorios de la etapa actual llegan a `finalizado`.
3. **Ciclo de vida del documento:** `elaboracion → revision → (correccion → elaboracion/revision de nuevo, si se devuelve) → finalizado`. Cada transición genera un `movimiento`.
4. **Sin carga inicial.** El sistema no importa las auditorías que ya están en curso en la matriz Excel; arranca vacío y solo registra actividades que se abran de aquí en adelante.
5. **Bitácora inmutable** es requisito no negociable — ningún movimiento se edita ni se borra; toda corrección es un movimiento nuevo.

---

## 7. Dashboards y métricas BI requeridas

Vistas por alcance de acceso (ver RLS en sección 8):
- **Dirección:** todas las actividades, los 3 departamentos, semáforo global, ranking de cuellos de botella por cargo/departamento/tipo de documento.
- **Subdirección:** filtrado a los departamentos bajo su subdirección (1 o 2, según corresponda).
- **Jefatura de departamento:** filtrado a su departamento.
- **Auditor:** su propia carga de trabajo.

Métricas mínimas:
- Distribución de actividades por color de semáforo (conteo y %).
- Tiempo promedio de permanencia por cargo (días en posesión) — el dato central del cuello de botella.
- Oficios vencidos / próximos a vencer.
- Carga de trabajo por auditor (actividades activas, documentos pendientes de su firma/revisión).
- % de cumplimiento histórico de plazos (hitos concluidos a tiempo vs. tarde).
- Comparación plan vs. real por etapa (el mismo patrón que ya usan manualmente en los cronogramas "Real" vs. "Proyectado").

---

## 8. Permisos y control de acceso (RLS en Supabase)

RLS debe reflejar simultáneamente **cargo** (qué ve) y **permiso_sistema** (qué puede hacer):
- Un Auditor ve y opera sobre sus propias actividades asignadas.
- Un Subjefe/Jefe ve las de su departamento.
- Un Subdirector ve las de los departamentos bajo su subdirección.
- El Director ve todo.
- `permiso_sistema = consulta` nunca permite escritura, sin importar el cargo.
- `permiso_sistema = control_total` (Dirección) es el único que puede insertar movimientos con `es_correccion_direccion = true`.

Login vía Supabase Auth con correo institucional; el NIT es un campo de perfil de negocio (identificador único en `usuarios`), no necesariamente la credencial de acceso.

---

## 9. Notificaciones — decisión abierta, construir con opciones

Se confirmó que el semáforo debe generar alerta activa (no solo visibilidad pasiva en dashboard), pero el mecanismo aún no está decidido. Contexto relevante: MINFIN no tiene tenant M365 (no hay Entra ID/Exchange/Graph disponible), así que una integración tipo Outlook no es viable de entrada. Construye el sistema de forma que el disparo de alerta (cuando algo pasa a naranja o rojo) sea un evento desacoplado del canal de envío, para poder elegir después entre:
- **Notificación in-app** (centro de notificaciones/badge dentro del sistema) — recomendado como punto de partida, no depende de infraestructura externa de MINFIN.
- **Correo vía servicio transaccional externo** (ej. Resend) con dominio propio — viable en paralelo, fase 2.
- Ambos combinados.

---

## 10. Identificadores

- **Actividad:** `NAI-XXX-AAAA` (consecutivo-año), único.
- **Oficio:** patrón `DAI-[DEPTO]-XXX-AAAA` observado en los registros reales de Auditorías Especiales — consecutivo por departamento y año. Validar formato, no inventar uno nuevo.

---

## 11. Entregables esperados de esta fase

1. Migraciones SQL (Supabase) para todas las entidades de la sección 4, con políticas RLS de la sección 8.
2. Seed data: 3 departamentos, 2 subdirecciones (con su mapeo fijo), catálogo de 18 documentos con su matriz de revisión importada del Excel fuente, calendario de feriados inicial.
3. CRUD funcional de actividades, hitos, documentos, oficios y movimientos.
4. Motor de cálculo de semáforo (recalculable — puede ser al vuelo en consulta o vía job diario, a tu criterio técnico) siguiendo la fórmula de la sección 5.
5. Dashboards BI (Recharts) segmentados por alcance de acceso (sección 7).
6. Vista de bitácora/timeline por actividad y por documento, legible para un no-técnico (esto es lo que un auditor de control interno va a enseñar como evidencia).

---

## 12. Seguridad (requisitos no negociables por ser herramienta institucional)

Este sistema produce registros que un auditor de control interno va a presentar como evidencia (sección 11.6) y maneja datos de personal (NIT, correo, cargo) de una entidad de gobierno (MINFIN). Por eso la seguridad no es una capa opcional para v2: los puntos de esta sección se construyen **junto con** el MVP, no después.

### 12.1 Inmutabilidad de la bitácora a nivel de base de datos

La regla de la sección 6.5 ("ningún movimiento se edita ni se borra") no puede depender solo de que el código de la aplicación se porte bien. Debe estar reforzada en Postgres:
- Revocar `UPDATE` y `DELETE` sobre `movimientos` para todos los roles de aplicación (incluido el rol con el que corre el backend), dejando únicamente `INSERT` permitido vía política RLS.
- Si se necesita "borrar" un movimiento por error de captura evidente, la única vía es un movimiento nuevo compensatorio (mismo patrón que `es_correccion_direccion`), nunca un `DELETE` real ni siquiera con privilegios elevados.
- Esto mismo aplica a `oficios` una vez enviado/recibido: los campos que documentan hechos ya ocurridos (`fecha_envio`, `fecha_recepcion`, `fecha_respuesta`) no deben ser editables libremente; su corrección pasa por el mismo mecanismo de movimiento/observación auditable.

### 12.2 Manejo de la service role key

La `SUPABASE_SERVICE_ROLE_KEY` (ya presente en `.env.local.example`) **bypassea RLS por completo**. Reglas:
- Nunca se expone al cliente ni se referencia en código que corre en el navegador.
- Ninguna operación que dependa de `permiso_sistema` o `cargo` (sección 8) se resuelve con este cliente "por comodidad" — el camino normal de lectura/escritura es siempre el cliente Supabase autenticado con el JWT del usuario, dejando que RLS decida.
- Su uso queda reservado a tareas administrativas server-only explícitamente identificadas (ej. jobs de sistema, seed, migraciones) y documentadas como tales en el código.

### 12.3 Autorización en profundidad (defense-in-depth)

RLS es la última línea de defensa, no la única. Server Actions / route handlers que escriben datos deben validar explícitamente `permiso_sistema` y el alcance del `cargo` del usuario **antes** de ejecutar la operación, para que un bug de RLS o una política mal escrita no se convierta en el único punto de falla.

### 12.4 Autenticación y sesión

- Alta de usuarios restringida a dominio de correo institucional (no self-signup abierto).
- MFA obligatorio para `cargo = director` y `cargo = subdirector`, y para cualquier usuario con `permiso_sistema = control_total` — son las cuentas con mayor radio de impacto (ven todo, o pueden corregir historial).
- Expiración de sesión razonable y re-autenticación para acciones sensibles (aprobar, corregir, registro tardío).
- Bloqueo/backoff ante intentos de login fallidos repetidos.

### 12.5 Uso de `control_total` y `es_correccion_direccion`

Esta es la vía de mayor riesgo de abuso del sistema: es la única que puede alterar la narrativa de un expediente después del hecho. Requisitos adicionales a la sección 4.8:
- `observacion` es **obligatoria** (no nullable a nivel de constraint) cuando `es_correccion_direccion = true` — nunca una corrección silenciosa.
- Cada uso de este permiso genera una notificación/entrada visible (no oculta en un log que nadie revisa) — como mínimo, aparece resaltado en la vista de bitácora de la sección 11.6, para que no se vuelva una forma discreta de "arreglar" atrasos.
- `captura_delegada` (asistente registrando en nombre de otro) no debe poder registrar `tipo_evento = aprobacion` en nombre de un cargo que no sea explícitamente delegable — una aprobación es una decisión de esa persona, no un trámite administrativo.

### 12.6 Datos personales de usuarios (NIT, correo)

- Los exports de BI (sección 7) respetan el mismo alcance de RLS que las vistas — un Auditor no puede exportar más de lo que puede ver en pantalla.
- Mensajes de error de la aplicación no deben filtrar NIT/correo de terceros a un usuario sin permiso para verlos.
- Logs de aplicación/errores (fuera de la bitácora de negocio) no deben incluir NIT ni correo en texto plano si van a un servicio externo de logging.

### 12.7 Almacenamiento de documentos — decisión pendiente con implicación de seguridad

El modelo de datos de la sección 4 registra el **movimiento** de los documentos (quién lo tiene, en qué fase) pero no define si el archivo real (PDF/Word del entregable) se sube al sistema o vive fuera de él. Esto queda como decisión abierta (ver pendientes al final), pero si la respuesta es "sí se sube":
- Requiere bucket de Supabase Storage con políticas RLS espejo de las de la sección 8 (quién puede subir/descargar según cargo y `permiso_sistema`).
- Validación de tipo y tamaño de archivo en el servidor (no solo en el cliente).
- El archivo nunca reemplaza el registro del `movimiento` — es un adjunto de una fila de bitácora existente, no una entidad editable aparte.

### 12.8 Transporte y cabeceras

- HTTPS forzado end-to-end (Vercel lo da por defecto; no desactivar).
- Cabeceras de seguridad estándar de Next.js (CSP, `X-Frame-Options`, `Referrer-Policy`) configuradas explícitamente, no dejadas en default.
- Rate limiting en endpoints de autenticación y en cualquier endpoint de exportación masiva de datos.

### 12.9 Antes de producción

Dado que el sistema va a producir evidencia usada por control interno de una entidad de gobierno, antes de salir a producción con datos reales se hace una revisión de seguridad dedicada de: políticas RLS (todas las tablas, no solo las obvias), la matriz de `permiso_sistema` contra escenarios reales de abuso, y la inmutabilidad de `movimientos` verificada con un intento real de `UPDATE`/`DELETE` contra la base con cada rol de aplicación.

---

### Pendientes a resolver antes o durante la construcción (no bloquean el arranque)
- Mecanismo final de notificación activa (sección 9).
- Umbrales definitivos del semáforo si los defaults de la sección 5 no calzan con la realidad operativa una vez en uso.
- Si los documentos reales (PDF/Word) se almacenan dentro del sistema o quedan fuera de alcance del MVP (sección 12.7) — afecta si se necesita Supabase Storage desde ya.
