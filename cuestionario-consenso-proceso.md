
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


-
-
-
