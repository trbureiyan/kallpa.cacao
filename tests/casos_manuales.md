# Registro de Casos de Prueba Manuales

Registro de ejecución de los 15 casos manuales del jurado y el ensayo del diferenciador offline.
Normativa: `.docs/reto_cacao.md`, `tests/README.md` y `documentos/E05_pruebas.md`.
Los resultados no ejecutados quedan en blanco/pendiente para ser completados por quien realiza la prueba con valores reales del jurado.

---

## Metadatos de la sesión de evaluación

- **Fecha:** 16 de octubre de 2026
- **Entorno:** Render (API + PostgreSQL Neon) / PWA local Vite
- **URL pública:** https://kallpa-cacao.onrender.com
- **Usuarios de prueba:** `admin` / `Admin123!` y `operador` / `Operador123!`

---

## Casos Manuales (M01 – M15)

### M01 · Crear un lote válido (RF01, RF07)
- **Objetivo:** Recepción como operador; reiniciar API y PWA; el lote sigue.
- **Datos y pasos:** Registrar recepción de 100 kg para una finca sintética (ej. Rivera). Consultar lote, origen y saldo disponible.
- **Resultado esperado:** Lote persistido con código `CACxxx`, disponible = 100 kg.
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

### M02 · Cantidad negativa o campo vacío (RF01)
- **Objetivo:** Validar rechazo de valores no numéricos, negativos o vacíos en recepción.
- **Datos y pasos:** Intentar enviar cantidad 0, -5, vacío y texto "abc".
- **Resultado esperado:** Cada solicitud inválida se rechaza con mensaje de dominio claro; no deja registros parciales.
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

### M03 · Idempotencia en recepción (RF01, RF08)
- **Objetivo:** Evitar duplicación ante reintentos de red.
- **Datos y pasos:** Repetir una recepción con la misma clave de idempotencia y payload; luego con misma clave y cantidad distinta.
- **Resultado esperado:** Reintento idéntico devuelve el mismo lote original sin duplicar existencias; payload distinto genera conflicto (422/409).
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

### M04 · Transformación 100 → 80 kg y merma (RF02, RF03, RF04, RF08)
- **Objetivo:** Verificar balance de masa, cálculo de merma y activación de alerta.
- **Datos y pasos:** Recibir 100 kg; transformar 100 kg en etapa de secado con salida 80 kg vendibles.
- **Resultado esperado:** Entrada queda en 0 kg disponibles, salida en 80 kg; merma calculada = 20,0 %; se genera alerta por superar el umbral del 15 %.
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

### M05 · Sobreconsumo de existencias (RF08)
- **Objetivo:** Comprobar que no se puede consumir más existencia de la disponible (falla crítica).
- **Datos y pasos:** Solicitar una transformación por una cantidad mayor a los kg disponibles del lote.
- **Resultado esperado:** Operación rechazada (409 / EXISTENCIA_INSUFICIENTE); saldo intacto sin registros parciales.
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

### M06 · Idempotencia en transformación (RF08)
- **Objetivo:** Proteger el inventario ante reenvíos de proceso.
- **Datos y pasos:** Reenviar la misma transformación con la misma clave de idempotencia.
- **Resultado esperado:** Se devuelve la transformación previa sin volver a descontar existencia del lote origen.
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

### M07 · Concurrencia de consumo (RF08)
- **Objetivo:** Garantizar que consumos concurrentes no dejen saldo negativo en PostgreSQL.
- **Datos y pasos:** Dos solicitudes concurrentes de 7 kg sobre un lote con saldo de 10 kg.
- **Resultado esperado:** Solo una transacción tiene éxito; la otra se rechaza por saldo insuficiente; saldo final = 3 kg.
- **Resultado obtenido:** Verificado en suite automatizada PostgreSQL (`test_concurrencia_postgres.py`).
- **Estado:** Ejecutado en backend
- **Evidencia:** Salida de pytest de concurrencia en contenedor PostgreSQL.

### M08 · Trazabilidad sobre 100 registros (RF03)
- **Objetivo:** Medir consulta de linaje completo en volumen y tiempo de respuesta.
- **Datos y pasos:** Ejecutar script de rendimiento `scripts/perf_trazabilidad.py` sobre 100 lotes y consultar trazabilidad.
- **Resultado esperado:** Linaje completo (finca -> recepción -> procesos -> salidas) en tiempo inferior a 3 segundos.
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

### M09 · Umbral de alerta de merma (RF04)
- **Objetivo:** Verificar que el umbral del 15 % es estricto y configurable.
- **Datos y pasos:** Probar transformación con merma de exactamente 15,0 % (100 kg -> 85 kg) y con 15,1 % (100 kg -> 84,9 kg).
- **Resultado esperado:** 15,0 % no genera alerta (no supera estrictamente el umbral); 15,1 % genera alerta con regla y causa explicadas.
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

### M10 · Costo unitario y margen con valores del jurado (RF05, RF12)
- **Objetivo:** Validar fórmulas económicas sin valores hardcodeados y manejo de división entre cero.
- **Datos y pasos:** Probar costo etapa = 1.600.000 COP, salida = 80 kg, precio = 25.000 COP/kg. Probar con salida = 0 kg y precio = 0 COP.
- **Resultado esperado:** Costo unitario = 20.000 COP/kg, margen = 20,0 %; con cero, resultado explícito no calculable con supuestos visibles, sin error 500 ni Infinity.
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

### M11 · Control de acceso para cambio de estado (RF09)
- **Objetivo:** El operador no puede liberar ni bloquear lotes (falla crítica).
- **Datos y pasos:** Autenticarse como `operador` e intentar cambiar estado de un lote a `LIBERADO` o `BLOQUEADO`.
- **Resultado esperado:** Backend responde 403 Forbidden; el estado del lote permanece inalterado.
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

### M12 · Bloqueo de lote CAC001 e incidencia hora 12 (RF09, RF10)
- **Objetivo:** Administrador bloquea con motivo obligatorio; historial y auditoría intactos (REG-001).
- **Datos y pasos:** Como `admin`, bloquear CAC001 con motivo "Reclamo del comprador sobre humedad"; consultar auditoría.
- **Resultado esperado:** Estado pasa a BLOQUEADO; no se puede transformar; evento registrado en auditoría con actor, fecha, motivo y valores antes/después; sin borrado de historial.
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

### M13 · Ficha pública de producto sin sesión (RF06, RF09)
- **Objetivo:** Comprador consulta `/ficha-publica` anónimamente sin exponer datos privados ni costos (falla crítica).
- **Datos y pasos:** Consultar lote CAC001 y lote derivado procesado sin token de autenticación.
- **Resultado esperado:** Código, origen, tipo de producto y disponibilidad visibles; costos internos, contacto del productor y motivo interno de bloqueo ausentes (`status_reason: null`).
- **Resultado obtenido:** HTTP 200 en Render (`https://kallpa-cacao.onrender.com/api/v1/public/products/CAC001`); costos omitidos y `status_reason: null`.
- **Estado:** Ejecutado en despliegue
- **Evidencia:** Prueba de humo HTTP en Render del 16/10/2026.

### M14 · Filtros y exportación a CSV (RF11)
- **Objetivo:** Administrador exporta inventario filtrado en CSV con codificación correcta.
- **Datos y pasos:** Como administrador, aplicar filtros de origen/estado y pulsar "Descargar CSV". Abrir en Excel.
- **Resultado esperado:** Descarga de archivo `.csv` con BOM UTF-8 (caracteres y tildes legibles), nombre fechado `inventario_AAAA-MM-DD.csv`, columnas requeridas y fórmulas neutralizadas con `'`. Operador recibe 403.
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

### M15 · Persistencia y respaldo tras reinicio (RF07)
- **Objetivo:** Reiniciar base de datos y verificar conservación íntegra de registros.
- **Datos y pasos:** Generar respaldo con `scripts/respaldo.py backup`, verificar checksums; reiniciar servicio y verificar restauración.
- **Resultado esperado:** Cantidades, identificadores e historial recuperados sin pérdida ni duplicación.
- **Resultado obtenido:** 
- **Estado:** Pendiente
- **Evidencia:** 

---

## Ensayo Adicional: Diferenciador Offline (D01)

### D01 · Recepción con conectividad limitada
- **Objetivo:** Registrar recepciones sin red, persistir en Dexie y sincronizar al reconectar.
- **Datos y pasos:**
  1. Abrir PWA en escritorio y en móvil con catálogo precargado.
  2. Desconectar internet (modo avión / offline).
  3. Registrar recepción de lote. Verificar estado "PENDIENTE" con código provisional `PEND-xxx`.
  4. Reconectar red.
  5. Sincronizar cola al servidor.
- **Resultado esperado:** Lote se envía al servidor mediante idempotencia; el servidor asigna código oficial `CACxxx`; no hay duplicación ni pérdida.
- **Resultado obtenido:** Ejecutado con éxito por el equipo en pruebas manuales previas tanto en escritorio como en móvil.
- **Estado:** Ejecutado (Aprobado)
- **Evidencia:** Reporte del equipo de pruebas del 16/10/2026.
