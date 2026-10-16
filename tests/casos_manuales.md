# Casos de prueba manuales

Quince casos que exige el reto. Las columnas **Obtenido**, **Estado** y **Evidencia** las llena quien ejecuta la prueba, tal como salió, incluidas las fallas. No se registran resultados que no ocurrieron.
Use valores distintos a los del ejemplo (100 kg, 80 kg, 1.600.000 COP, 25.000 COP/kg) para comprobar que se calcula y no se muestran cifras fijas. Usuarios sintéticos: `admin` / `Admin123!` y `operador` / `Operador123!` (solo en bases con `SEED_DEMO_DATA=true`).

| ID | Requisito | Datos | Pasos | Esperado | Obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|
| CM-01 | RF01 · flujo feliz | Finca B, 137,5 kg, 1.450.000 COP, fecha de hoy | Operador → Recepción → Guardar y sincronizar | Lote con código `CACxxx` asignado por el servidor, estado Pendiente, 137,5 kg disponibles en Inventario | | | |
| CM-02 | RF01 · dato inválido | Cantidad `0`, `-5`, vacía, `12,5abc`, `1e3`; costo `20000´¨P` | Intentar guardar cada valor | No se guarda; mensaje en tres partes junto al campo; no aparece lote nuevo | | | |
| CM-03 | RF01 · lote duplicado | Repetir el envío de la misma recepción (recargar con la cola pendiente o reenviar) | Reenviar la misma captura | Un solo lote en el servidor; la cola queda Sincronizado sin duplicar | | | |
| CM-04 | RF02 · merma y alerta | Lote recibido con 120 kg; transformar 120 → 90 kg | Operador → Transformación | Merma 25,0 %, alerta de merma con regla (> 15 %) y causa | | | |
| CM-05 | RF08 · falta de existencia | Lote con 50 kg disponibles; pedir 60 kg | Registrar transformación | Rechazo: solicitó 60 kg y hay 50 kg; existencia sin cambios | | | |
| CM-06 | RF02 · reenvío de operación | Transformación válida; perder la respuesta (desconectar al enviar) y reintentar | Reintentar el mismo formulario | Un solo consumo y un solo lote de salida (misma clave idempotente) | | | |
| CM-07 | RF05 · costos con salida 0 | Salida vendible 0 kg, costo 500.000 COP | Registrar o consultar economía | Costo unitario no calculable explicado; sin división entre cero ni "Infinity" | | | |
| CM-08 | RF05 · costo y margen | 90 kg de salida, costo 1.350.000 COP, precio 22.000 COP/kg | Administrador → Inventario / economía | 15.000 COP/kg y margen 31,8 %, con fórmula, unidades y supuestos visibles | | | |
| CM-09 | RF09 · permiso denegado | Sesión de operador | Intentar liberar o bloquear un lote; abrir `/inventario` y `/auditoria` | El operador no ve las acciones y la API responde 403 | | | |
| CM-10 | RF07 · bloqueo y consulta pública | Administrador bloquea CAC001 con motivo | Abrir `/ficha-publica?lote=CAC001` sin sesión | Estado Bloqueado, no disponible, origen y recorrido; sin costos, sin productor y sin el motivo interno | | | |
| CM-11 | RF10 · cambio auditado | Administrador libera un lote con motivo | Revisar Auditoría | Quién, cuándo (hora del servidor), valor anterior, valor nuevo y motivo | | | |
| CM-12 | Persistencia | Crear un lote | Reiniciar API y PWA; volver a consultar | El lote y sus movimientos siguen igual | | | |
| CM-13 | RF11 · exportación | Administrador con filtro de origen y estado | Exportar CSV y abrirlo en Excel o Calc | Archivo `lotes_AAAA-MM-DD.csv`, tildes correctas, solo los lotes filtrados, sin fórmulas ejecutables | | | |
| CM-14 | Respaldo y restauración | Base con lotes y transformaciones | `scripts/respaldo.py backup`, detener API, `restore --confirmar`, `verify` | Mismas cantidades e identificadores; sin pérdida ni duplicación | | | |
| CM-15 | Incidencia hora 12 (REG-001) y rendimiento | CAC001 con transformación; 100 registros sintéticos | Bloquear CAC001 y revisar trazabilidad; correr `scripts/perf_trazabilidad.py` y medir la pantalla en el navegador | Historial intacto y cantidades afectadas explicadas; trazabilidad ≤ 3 s con método y equipo declarados | | | |

Además, sin conexión (diferenciador): con la red desactivada registrar dos recepciones, reconectar y comprobar que se sincronizan con código `CACxxx`, sin duplicar, en escritorio y en móvil. Registrar el resultado en la fila CM-03 o en una fila adicional.
