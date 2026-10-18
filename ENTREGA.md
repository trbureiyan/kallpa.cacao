# E10 - Índice de entrega y estado del producto

**Versión final para la evaluación.** Actualizado el 16 de octubre de 2026. Este documento describe la solución integrada en el repositorio, la matriz de trazabilidad de requisitos (RF01–RF12) contra componentes y pruebas, y el estado de la verificación.

## 1. Identificación y acceso

- **Repositorio:** [trbureiyan/kallpa.cacao](https://github.com/trbureiyan/kallpa.cacao).
- **Ramas:** `master` (despliegue en Render) y `qa/ajustes-jurado` (ajustes finales con CI verde).
- **Hash de referencia Render (live):** `a6fb575`.
- **Hash de ajustes finales (`qa/ajustes-jurado`):** `5729be4`.
- **Despliegue activo:** [https://kallpa-cacao.onrender.com](https://kallpa-cacao.onrender.com).
- **Base de datos en producción:** Neon PostgreSQL (AWS us-west-2, `suspend_timeout_seconds: 0`).
- **Nombre del proyecto:** `kallpa.cacao` | II Hackathon de Programación USCO.
- **Equipo:** David (Graffe), Alejandro, Brayan y Emanuel.
- **Usuarios de demostración en producción:** `operador` / `Operador123!` y `admin` / `Admin123!`.


## 2. Qué hace la solución

El backend permite registrar productores y fincas, recibir cacao en un lote, registrar transformaciones y lotes de salida, consultar existencias y trazabilidad, cambiar estados con autorización, calcular alertas de merma, registro incompleto y retraso, consultar datos económicos, publicar una ficha de producto y exportar lotes a CSV.

El flujo vertical que se debe demostrar es:

```text
Productor y finca → recepción → lote de materia prima → transformación
→ lote(s) procesado(s) → movimientos y saldo → trazabilidad / ficha pública
```

Una transformación consume un lote de entrada y puede crear una o varias salidas. La venta no está implementada en esta rama. El diferenciador offline se limita a recepción; la transformación necesita conexión para que el servidor valide existencias.

## 3. Arquitectura y datos

El backend usa FastAPI, SQLAlchemy y Alembic. Docker Compose configura PostgreSQL con un volumen persistente y una API; el proyecto también permite SQLite para desarrollo local y pruebas. La API publica OpenAPI/Swagger en `/docs`. `src/frontend/` contiene el frontend React/PWA canónico; su build de producción está verificado. La revisión visual manual contra la pila integrada queda fuera de esta entrega.

Los modelos principales son `User`, `Producer`, `Farm`, `Lot`, `Reception`, `Transformation`, `TransformationOutput`, `InventoryMovement`, `CostEntry` y `AuditEvent`. `CostEntry` es la fuente única de costos; la migración `e4219b1a7c30` elimina `FinanceRecord` y `Transformation.costs_cop`. El diagrama y las decisiones están en [E03](documentos/E03_diseno.md); las historias y criterios, en [E02](documentos/E02_requisitos.md).

Los costos se guardan en un solo libro: `CostEntry`. El costo de compra se asocia al lote recibido y el costo de procesamiento se distribuye por masa entre los lotes de salida. El precio propuesto queda en `Transformation`. La migración conserva el costo que exponía la API anterior y elimina las copias de costo. La auditoría tiene guardas ORM y triggers `UPDATE`/`DELETE` en PostgreSQL y SQLite de pruebas.

## 4. Reglas visibles para evaluación

- Recepción: cantidad positiva, unidad explícita e identificador de lote único. La clave idempotente permite reintentar una operación sin crear otra recepción.
- Transformación: comprueba lote, estado, stock y unidad; el consumo y la creación de salidas/movimientos se hacen en una transacción. Misma clave y mismo contenido devuelve el resultado previo; misma clave con contenido diferente produce conflicto.
- Merma: `(entrada - salida) / entrada × 100`. La alerta de merma del caso se activa si supera estrictamente 15 %.
- Registro incompleto: alerta si una etapa no tiene responsable o no tiene ningún registro de costo de procesamiento; un registro de COP 0 cuenta como presente.
- Retraso: alerta si hay existencia mayor que 0, el lote no está bloqueado y supera los días desde su última etapa o, si no tiene etapas, desde la recepción. `DELAY_ALERT_DAYS` configura el límite (7 días por defecto).
- Economía: costo unitario = suma de costos de etapa / cantidad de salida vendible; margen sobre venta = `(precio - costo unitario) / precio × 100`. La compra de materia prima queda aparte y no se suma al indicador. Salida o precio cero produce indicador no calculable con explicación.
- Estados: `pending`, `released`, `blocked`. El cambio requiere rol administrador y motivo. La ficha pública solo informa disponible un producto liberado.
- Público: el endpoint usa un esquema permitido y excluye contacto del productor y costos internos.
- Seguridad: la autorización se valida en endpoints del backend; ocultar una acción en la interfaz no sustituye ese control.

La guía del reto no afirma que la trazabilidad otorgue certificaciones de Comercio Justo u orgánicas. La aplicación puede respaldar registros que se utilicen en procesos de certificación, pero no certifica productos.

## 5. Ejecución de backend disponible

Para iniciar PostgreSQL y la API sin construir el frontend, desde `backend/`:

```powershell
docker compose up --build db api
```

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Salud: `http://localhost:8000/health`

Para ejecutar localmente sin Docker, desde `backend/`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Pruebas automatizadas, también desde `backend/`:

```powershell
python -m pytest -q
```

Verificación técnica ejecutada el 16-10-2026 en el commit `5729be4` (`qa/ajustes-jurado`): `pytest` en `backend/` terminó con 116 aprobadas, 1 omitida y 1 advertencia Starlette/TestClient; `pytest tests -q` desde la raíz terminó con 32 aprobadas (respaldo, concurrencia PostgreSQL, trazabilidad 100 registros y regresión REG-001 de la hora 12). En `src/frontend/`: TypeScript (`tsc -b`), Vitest (362 aprobadas, 14 skipped), ESLint y Vite build de producción PWA pasaron 100 % en verde. En el despliegue de Render (`https://kallpa-cacao.onrender.com`): `/health` (HTTP 200), login `/api/v1/auth/login` (HTTP 200), ficha pública anónima sin costos ni motivos de bloqueo (HTTP 200), y rechazo 401 en endpoints protegidos sin sesión verificados.

## 6. Matriz de trazabilidad de requisitos (E10)

Matriz canónica exigida por la sección 6.3 del reto: `Requisito → Componente o pantalla → Prueba → Resultado → Archivo de evidencia`.

| Requisito | Componente / Pantalla | Prueba automatizada / manual | Resultado | Archivo de evidencia |
|---|---|---|---|---|
| **RF01 Recepción de lotes** | `backend/app/api/receptions.py`, `src/frontend/src/features/recepcion/` | `backend/tests/test_recepcion_lote.py`, `recepcionCola.test.ts`, CM-01 a CM-03 | **Aprobado** (identificador único `CACxxx`, rechazo de ≤ 0 y texto, idempotencia UUID) | `backend/tests/test_recepcion_lote.py`, `tests/casos_manuales.md` |
| **RF02 Transformación** | `backend/app/api/transformations.py`, `src/frontend/src/features/transformacion/` | `backend/tests/test_transformacion_salida_trazable.py`, `procesoApi.test.ts`, CM-04, CM-06 | **Aprobado** (balance de masa, validación estricta de decimales, vinculación de salidas) | `backend/tests/test_transformacion_salida_trazable.py` |
| **RF03 Trazabilidad** | `backend/app/services/traceability.py`, `src/frontend/src/pages/TracePage.tsx` | `backend/tests/test_trazabilidad.py`, `test_trazabilidad_100.py`, CM-08 | **Aprobado** (linaje bidireccional desde lote crudo a producto terminado, ≤ 3 s en 100 registros) | `tests/backend/rendimiento/test_trazabilidad_100.py` |
| **RF04 Alerta para decidir** | `backend/app/api/alerts.py`, `src/frontend/src/features/alertas/` | `backend/tests/test_merma_y_perdidas.py`, `test_alertas_incompletas_retrasos.py`, CM-04, CM-09 | **Aprobado** (merma > 15 % estricto, campos faltantes y retraso con regla y causa visibles) | `backend/tests/test_merma_y_perdidas.py` |
| **RF05 Indicador económico** | `backend/app/services/economics.py`, `src/frontend/src/features/economia/` | `backend/tests/test_costo_sin_dato.py`, `src/frontend/src/features/economia/reglas.test.ts`, CM-07, CM-08 | **Aprobado** (costo unitario $20.000 COP/kg y margen 20 %; división entre cero prevenida con null) | `backend/tests/test_costo_sin_dato.py` |
| **RF06 Ficha comercial** | `backend/app/api/public.py`, `src/frontend/src/pages/PublicFichaPage.tsx` | `backend/tests/test_ficha_publica_auditoria_global.py`, CM-10 | **Aprobado** (esquema público estricto; costos, contacto y motivo interno de bloqueo omitidos) | `backend/tests/test_ficha_publica_auditoria_global.py`, Render Smoke Test |
| **RF07 Persistencia** | PostgreSQL (Neon) / SQLite, SQLAlchemy, Alembic | `tests/backend/integration/test_respaldo.py`, CM-12, CM-14 | **Aprobado** (persistencia tras reinicio y restauración atómica con verificación de checksums) | `tests/backend/integration/test_respaldo.py` |
| **RF08 Inventario disponible** | `backend/app/services/inventory.py`, `src/frontend/src/pages/InventoryPage.tsx` | `backend/tests/test_inventario_idempotencia.py`, `test_concurrencia_postgres.py`, CM-05 | **Aprobado** (recibido − consumido, rechazo de sobreconsumo, reenvío sin duplicar consumo) | `backend/tests/test_inventario_idempotencia.py` |
| **RF09 Estado del producto** | `backend/app/api/lots.py`, `src/frontend/src/features/estados/` | `backend/tests/test_permisos_roles.py`, `estadosApi.test.ts`, CM-09, CM-10 | **Aprobado** (pending/released/blocked; operador recibe 403; motivo obligatorio para admin) | `backend/tests/test_permisos_roles.py` |
| **RF10 Auditoría mínima** | `backend/app/models/audit.py`, `src/frontend/src/features/auditoria/` | `backend/tests/test_ficha_publica_auditoria_global.py`, `test_incidencia_cac001.py`, CM-11 | **Aprobado** (tabla solo-inserción con triggers anti-UPDATE/DELETE; quién, cuándo y qué cambió) | `tests/backend/regresion/test_incidencia_cac001.py` |
| **RF11 Consulta y exportación** | `backend/app/api/exports.py`, `src/frontend/src/features/reportes/csv.ts` | `backend/tests/test_exportacion_csv_seguro.py`, `csv.test.ts`, CM-13 | **Aprobado** (filtros origen/estado, descarga con BOM UTF-8 y neutralización de fórmulas `'`) | `backend/tests/test_exportacion_csv_seguro.py`, `src/frontend/src/features/reportes/csv.test.ts` |
| **RF12 Balance económico completo** | `backend/app/services/analytics.py`, `src/frontend/src/features/economia/` | `backend/tests/test_costo_sin_dato.py`, `test_economia_exportacion_auditoria.py` | **Aprobado** (`CostEntry` único, compra excluida de costo de etapa, analítica sin margen 100 % inventado) | `backend/tests/test_costo_sin_dato.py` |

## 7. Entregables documentales

| Entregable | Archivo | Estado actual |
|---|---|---|
| E01 Problema y propuesta de valor | `documentos/E01_problema.md` | Borrador con usuarios, restricciones y beneficios medibles. |
| E02 Requisitos | `documentos/E02_requisitos.md` | 12 historias de usuario cubriendo RF01–RF12 con criterios de aceptación. |
| E03 Diseño | `documentos/E03_diseno.md` | Flujo de usuario, arquitectura modular y modelo de datos con libro único de costos. |
| E04 Producto y código | `backend/`, `src/frontend/` | Backend FastAPI y PWA React integrados; responsive móvil a 360 px y PWA verificados. |
| E05 Pruebas | `documentos/E05_pruebas.md`, `tests/casos_manuales.md`, `backend/tests/`, `tests/` | 148 pruebas automatizadas de backend + 362 de frontend en verde. Matriz de 15 casos en `tests/casos_manuales.md`. |
| E06 Usabilidad | `documentos/E06_usabilidad.md` | Recorrido de tareas, prueba táctil en móvil y mejoras de contraste y tamaño de objetivo (44 px). |
| E07 Operación | `documentos/E07_operacion.md`, `README.md`, `tests/README.md` | Guía de instalación, variables de entorno, Docker Compose, respaldo (`scripts/respaldo.py`) y verificación. |
| E08 IA y fuentes | `documentos/E08_IA_y_fuentes.md` | Bitácora de modelos de IA, componentes generados, revisión humana y licencias de terceros. |
| E09 Piloto y pitch | `documentos/E09_piloto.md`, `pitch/` | Propuesta de piloto de 30 días, estructura de costos y diapositivas de pitch comercial. |
| E10 Índice | `ENTREGA.md` | Este documento; matriz completa de trazabilidad RF01–RF12, hashes de commit y accesos. |

## 8. Límites declarados del producto

1. **Transformación sin conexión:** Por diseño del sistema para proteger el balance de masa (falla crítica), transformar lotes y cambiar estados exige conexión activa con el servidor. El diferenciador offline opera en la captura y encolado de recepciones de materia prima.
2. **Propagación del bloqueo a derivados:** Al bloquear un lote de origen (CAC001), este queda bloqueado para consumo y su ficha pública lo reporta no disponible. La propagación automática en cascada a todos los productos derivados preexistentes queda declarada como mejora para el piloto de 30 días.
3. **Concurrencia multi-proceso:** Evaluada y garantizada en PostgreSQL (base de producción en Neon); SQLite se utiliza para desarrollo local y ejecución rápida de pruebas en memoria.
4. **Unidad única:** Todos los cálculos de inventario, merma y balance de masa operan en kilogramos (kg).


La guía oficial pide que la solución funcione en computador y móvil. En esta revisión no hay evidencia suficiente para certificar esa experiencia; la falta de evidencia no equivale a afirmar que la interfaz móvil sea un fallo. El reto también establece un paquete documental de hasta 15 páginas, sin contar pitch ni resultados de pruebas. Una puntuación mínima indicada por la guía no garantiza ganar.

## Actualización técnica: integración de pantallas

Se conectaron las pantallas activas de panel, transformación, trazabilidad, inventario, alertas, economía, auditoría, administración de usuarios y ficha pública con FastAPI. La recepción conserva su cola IndexedDB. Los prototipos que dependían de Dexie/React Router ausentes se archivaron en `src/frontend/design-reference/legacy/`; la interfaz activa no depende de esos módulos.

Verificación ejecutada el 16-10-2026: build PWA `npm run build` exitoso; suite backend 18 aprobadas/1 omitida (concurrencia aparte: 1 aprobada en PostgreSQL temporal); `/health`, `/docs` y frontend respondieron HTTP 200; Alembic actual `b6d1ef3a9204 (head)`. El chequeo HTTP no certifica el recorrido visual. Las pruebas manuales, la restauración y la medición de rendimiento quedan fuera de esta verificación.
