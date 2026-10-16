# E02 - Requisitos y organización

## Alcance

`kallpa.cacao` es el nombre del repositorio y `AgroCacao Huila` aparece como nombre de la interfaz. El equipo debe confirmar si conservará ambos nombres. El MVP está dirigido a una asociación cacaotera simulada: operador de campo, administrador y comprador público. Los datos de demostración son ficticios.

El flujo principal es recibir un lote, transformarlo, consultar su trazabilidad y existencias, calcular merma/costos, y permitir que un administrador controle el estado del producto y consulte la ficha pública. El sistema está planteado como aplicación web/PWA para equipos de escritorio y móviles. En la rama actual `backend`, el código frontend no está completo: varios archivos fuente aparecen vacíos; su ejecución visual debe verificarse en la versión que contenga el frontend.

## Requisitos oficiales

Resumen del texto y criterios de aceptación de la guía oficial, secciones 3 y 4. Verifique los cambios contra [el PDF del reto](../concurso/Reto_Oficial_Devurity_Agroindustria.pdf) antes de congelar la entrega.

| Código | Funcionalidad y aceptación mínima del reto |
|---|---|
| RF01 | Recepción de lotes: identificador único, productor, origen, fecha, cantidad y unidad; rechazar cantidades no positivas. |
| RF02 | Transformación: etapa, responsable, fecha, entradas, salidas e incidencias; vincular cada salida con su lote de origen. |
| RF03 | Trazabilidad: consultar el recorrido desde el lote recibido hasta el producto terminado. |
| RF04 | Alerta para decidir: calcular alertas por merma, registro incompleto, retraso o costo; explicar regla y causa. |
| RF05 | Indicador económico: calcular costo unitario o margen estimado con fórmula, unidades y supuestos visibles. |
| RF06 | Ficha comercial: consultar producto por enlace, código o QR; ocultar costos internos y datos privados. |
| RF07 | Persistencia: conservar y recuperar los registros después de reiniciar la aplicación. |
| RF08 | Inventario disponible: controlar recibido, consumido y disponible por lote; impedir sobreconsumo y doble consumo al reenviar. |
| RF09 | Estado del producto: manejar pendiente, liberado y bloqueado; solo administrador cambia estado con motivo; bloqueado no se ofrece disponible en ficha pública. |
| RF10 | Auditoría mínima: registrar quién, cuándo y qué cambió en cantidades, transformaciones o estados, con valores anterior/nuevo; no borrar historial para ocultar cambios. |
| RF11 | Consulta y exportación: filtrar lotes por origen o estado; exportar CSV para administrador con identificador, origen, cantidades, estado y costos. |
| RF12 | Balance económico: calcular costo unitario y margen sobre venta, evitar división por cero y explicar costos incluidos; respetar el ejemplo base del reto. |

La guía además exige que las reglas de inventario, costos y permisos se apliquen en la capa que controla los datos, que la ficha pública entregue solo campos autorizados y que los errores no dejen registros parciales.

## Historias de usuario

Las prioridades son una propuesta para organizar el trabajo: P0 cubre el flujo evaluable; P1 añade reporte y continuidad operativa. Todo RF sigue siendo obligatorio según la guía. El responsable se deja pendiente para que el equipo lo asigne; no se inventan compromisos personales.

| ID | Requisito | Historia | Criterios de aceptación comprobables | Prioridad | Responsable | Estado de evidencia |
|---|---|---|---|---|---|---|
| HU01 | RF01 | Como operador, quiero registrar una recepción con identificador, productor, origen, fecha, cantidad y unidad, para dejar constancia del cacao recibido. | Se guarda con una clave única; se rechazan cantidades menores o iguales a cero y campos requeridos ausentes. | P0 | Por asignar | Hay endpoint y prueba automatizada de recepción; completar casos manuales y evidencia visual. |
| HU02 | RF02 | Como operador, quiero registrar una transformación con etapa, responsable, fecha, entradas, salidas e incidencias, para documentar el proceso. | La salida queda como lote y mantiene la relación con el lote de entrada; inventario y transformación se confirman juntos. | P0 | Por asignar | Hay endpoint y pruebas de transformación; completar evidencia de recorrido en la interfaz. |
| HU03 | RF03 | Como usuario interno, quiero consultar el linaje de un lote desde el origen o desde el producto procesado, para explicar su recorrido. | La respuesta conecta recepción/finca, transformación y lotes de salida; conserva todos los orígenes que representen las relaciones admitidas. | P0 | Por asignar | Existe servicio y prueba de trazabilidad; falta registrar medición con 100 registros. |
| HU04 | RF04 | Como administrador, quiero ver alertas de merma y otras condiciones operativas, para decidir si debo investigar. | La alerta explica regla y causa; la merma superior al 15 % activa alerta y exactamente 15 % no la activa. | P0 | Por asignar | Existe lógica y prueba de umbral; falta evidencia de visualización y confirmar cobertura de las otras causas oficiales. |
| HU05 | RF05 | Como administrador, quiero consultar costo unitario o margen estimado, para evaluar el precio propuesto. | La interfaz muestra fórmula, unidad y supuestos; una salida cero no causa división por cero. | P0 | Por asignar | Hay endpoint/servicio; completar caso con valores modificados y evidencia de UI. |
| HU06 | RF06 | Como comprador, quiero consultar el producto por enlace o código, para revisar información comercial aprobada. | La consulta no requiere inicio de sesión y excluye costos internos y datos privados del productor. | P0 | Por asignar | Existe endpoint público con esquema de respuesta; falta guardar una prueba anónima y captura. |
| HU07 | RF07 | Como usuario interno, quiero que los registros persistan al reiniciar el sistema, para poder recuperarlos después. | Una prueba de reinicio compara conteos, identificadores y relaciones antes y después; una restauración se verifica por separado. | P0 | Por asignar | El informe registra una prueba PostgreSQL aislada; falta adjuntar procedimiento y evidencia de restauración. |
| HU08 | RF08 | Como operador, quiero ver el stock disponible y registrar consumos válidos, para no sobrepasar las existencias. | Un consumo mayor al disponible falla sin cambios parciales; reintentar la misma clave no duplica el consumo; una clave con otro payload devuelve conflicto. | P0 | Por asignar | Hay pruebas de rollback/idempotencia y una prueba PostgreSQL concurrente descrita; consolidarlas en E05. |
| HU09 | RF09 | Como administrador, quiero liberar o bloquear un lote con motivo, para controlar si puede continuar en el flujo comercial. | El backend niega el cambio al operador; todo cambio exige motivo; un bloqueado no se presenta como disponible en la ficha. | P0 | Por asignar | Existen rutas y prueba de permisos descrita; completar evidencia del flujo de bloqueo y ficha pública. |
| HU10 | RF10 | Como administrador, quiero revisar quién cambió cantidades, transformaciones o estados, para conservar responsabilidad e historial. | Se registra actor, fecha, acción y valores anterior/nuevo; la aplicación no permite borrar el historial. | P0 | Por asignar | Auditoría ORM + trigger; pruebas API/migración verifican valores y bloqueo update/delete. Falta ensayo manual PostgreSQL. |
| HU11 | RF11 | Como administrador, quiero filtrar lotes por origen o estado y exportarlos a CSV. | Backend filtra; CSV contiene identificador, origen, cantidades, estado y costos; operador recibe rechazo. | P1 | Por asignar | Backend/UI implementados; pytest verifica filtros, costos de compra/procesamiento y 403. Falta prueba visual. |
| HU12 | RF12 | Como administrador, quiero calcular costo unitario y margen con costos explícitos. | Fórmulas, unidades y supuestos visibles; división por cero controlada; ejemplo oficial reproducible. | P0 | Por asignar | CostEntry canónico y prueba automatizada reproduce COP 20.000/kg y margen 20 %. Falta evidencia visual/manual. |

## Diferenciador: captura con conectividad limitada

| ID | Historia | Criterios propuestos | Estado |
|---|---|---|---|
| D01 | Como operador de campo, quiero guardar recepciones cuando no hay red y sincronizarlas al reconectar, para no perder la captura. | La PWA previamente preparada conserva una recepción en IndexedDB tras recarga, la marca pendiente y la sincroniza una sola vez al volver la conexión. Los errores de autenticación o validación conservan el registro para revisión. | El informe registra una ejecución manual confirmada por el usuario y una sola operación en PostgreSQL; falta adjuntar capturas y repetir en la versión de entrega. |

## Organización

El marco de proyecto lista a Graffe (David), Alejandro, Brayan y Emanuel. Confirmar nombres completos, responsable por historia, tablero de tareas, enlaces a commits y cambios antes de entregar. El cambio de hora 12 debe registrar incidente, impacto, decisión, modificación de aceptación y prueba de regresión; la historia detallada está pendiente en E05.
