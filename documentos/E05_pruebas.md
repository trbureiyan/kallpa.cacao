# E05 - Plan e informe de pruebas

**Estado: borrador.** Este documento separa resultados ya registrados de las pruebas manuales pendientes. Los casos pendientes son un plan; no significan que la aplicación haya pasado esos casos.

## Automatización existente

La suite está en `backend/tests/`. Sus archivos cubren recepción, transformación/trazabilidad, cálculo/alerta de merma, idempotencia/inventario, roles/permisos, migraciones Alembic y una prueba opcional de concurrencia PostgreSQL.

Comando, desde `backend/`:

```powershell
python -m pytest -q
```

El último resultado registrado en `concurso/Revision_funcional_y_plan_siguiente.txt` fue 14 aprobadas y 1 omitida cuando no se configuró `TEST_POSTGRES_URL`. La carrera PostgreSQL se ejecutó aparte en PostgreSQL 16 desechable: dos solicitudes de 7 kg sobre 10 kg dieron un éxito y un conflicto; saldo final 3 kg. Es evidencia histórica de ese ensayo, no una ejecución en este borrador/commit. La migración y el reinicio de la base persistente activa no se verifican aquí.

La comprobación de navegador/IndexedDB reportada por el usuario debe repetirse en la versión que se entregará y conservar capturas antes y después de sincronizar. La prueba de interacción visual, restauración del respaldo y medición con 100 registros todavía no tienen evidencia adjunta.

## Casos manuales

Los pasos se deben ejecutar en una base desechable y con datos sintéticos. Antes de ejecutar cada caso, completar la versión/hash y el entorno. Guardar captura, respuesta HTTP o consulta de base que respalde el resultado.

| ID | RF | Datos y pasos | Resultado esperado | Resultado obtenido | Estado / evidencia |
|---|---|---|---|---|---|
| M01 | RF01, RF07 | Crear una recepción válida de 100 kg para una finca sintética y consultar lote, origen y saldo. | Un lote persistido con identificador único, origen y 100 kg disponibles. | Pendiente | Pendiente de ejecución. |
| M02 | RF01 | Enviar cantidad 0, cantidad negativa y omitir un campo obligatorio. | Cada solicitud inválida se rechaza y no deja registros parciales. | Pendiente | Pendiente de ejecución. |
| M03 | RF01, RF08 | Repetir una recepción con la misma clave y payload; después reutilizar la clave con cantidad distinta. | Reintento idéntico devuelve el mismo resultado; payload distinto tiene conflicto y no duplica inventario. | Pendiente | Pendiente de ejecución. |
| M04 | RF02, RF03, RF04, RF08 | Recibir 100 kg y transformar 100 kg de entrada en 80 kg de salida. Consultar ambos lotes, movimientos, merma y trazabilidad. | Entrada queda con 0 kg; salida con 80 kg; merma 20 %; linaje llega a la finca original y se genera alerta. | Pendiente | Pendiente de ejecución. |
| M05 | RF08 | Solicitar transformación por encima del saldo disponible y consultar tablas de transformación, lotes, movimientos, costos y auditoría. | Solicitud rechazada; saldo intacto y sin registros parciales. | Pendiente | Pendiente de ejecución. |
| M06 | RF08 | Reenviar transformación con misma clave/payload y luego con mismo ID de idempotencia y payload distinto. | El reintento no vuelve a consumir stock; contenido distinto produce conflicto. | Pendiente | Pendiente de ejecución. |
| M07 | RF08 | En PostgreSQL de ensayo, lanzar dos consumos concurrentes de 7 kg sobre un lote con 10 kg. | Solo un consumo se confirma; el saldo no es negativo. | Pendiente | Repetir en la versión final; el resultado histórico está en el informe. |
| M08 | RF03 | Cargar 100 lotes sintéticos y consultar la trazabilidad del lote indicado; registrar equipo, método y tiempo. | Linaje correcto y medición reproducible; comparar con el objetivo de hasta 3 segundos de la guía. | Pendiente | Pendiente de ejecución. |
| M09 | RF04 | Registrar una transformación que produzca exactamente 15 % de merma y otra por encima de 15 %. | La primera no activa la regla “supera 15 %”; la segunda sí y muestra regla y causa. | Pendiente | Pendiente de ejecución. |
| M10 | RF05, RF12 | Usar los valores oficiales: COP 1.600.000 de costo de etapa, 80 kg vendibles y precio COP 25.000/kg; repetir con salida 0 y precio 0. | COP 20.000/kg, margen 20 %; los casos cero no dividen y explican por qué no hay indicador. | Pendiente | Pendiente de ejecución. |
| M11 | RF09 | Autenticarse como operador e intentar cambiar estado directamente por API. | Backend responde no autorizado y conserva el estado original. | Pendiente | Pendiente de ejecución. |
| M12 | RF09, RF10 | Como administrador, bloquear CAC001 con motivo; intentar transformarlo y consultar evento de auditoría. | Operación restringida; estado/motivo y actor/fecha/valores quedan consultables sin borrar historia. | Pendiente | Caso de regresión de hora 12; registrar cambios reales y resultado. |
| M13 | RF06, RF09 | Abrir ficha sin autenticación para producto liberado y después bloqueado; revisar campos de respuesta. | Liberado figura disponible; bloqueado no disponible; no aparecen costos ni datos privados del productor. | Pendiente | Pendiente de ejecución. |
| M14 | RF11 | Como administrador, filtrar por origen y estado; exportar CSV. Repetir exportación como operador. | CSV contiene identificador, origen, cantidades, estado y costos; rol no autorizado recibe rechazo. | Pendiente | Pendiente de ejecución. |
| M15 | RF07 | En PostgreSQL desechable, guardar conteos/códigos, reiniciar servicios sin borrar volumen; luego restaurar un respaldo en otra base aislada y comparar. | Datos persisten tras reinicio y el respaldo restaura IDs, cantidades y relaciones esperadas sin duplicados. | Pendiente | Pendiente de ejecución. |

## Ensayo adicional del diferenciador offline

| ID | Pasos | Resultado esperado | Resultado obtenido | Estado / evidencia |
|---|---|---|---|---|
| D01 | Preparar PWA con red y catálogo descargado; desconectar realmente el acceso a la API; capturar recepción; recargar; reconectar y sincronizar. Repetir con corte de envío y token vencido. | Recepción queda pendiente localmente tras recarga; al volver red llega una sola vez. Error de sesión conserva la cola para reautenticación. | El informe registra un ensayo de recarga/sincronización y conteos de una operación. | Adjuntar capturas, hash de versión y evidencia SQL del ensayo final. |

## Reglas de registro

Para cada ejecución, completar fecha, commit, sistema operativo, navegador/base de datos, datos de entrada, resultado observado, aprobado/reprobado y enlaces a evidencia. No convertir los resultados esperados de estas tablas en resultados obtenidos. El informe final debe describir la prueba de regresión de hora 12 y los defectos encontrados/corregidos.
