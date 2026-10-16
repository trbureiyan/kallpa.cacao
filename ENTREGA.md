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

El backend usa FastAPI, SQLAlchemy y Alembic. Docker Compose configura PostgreSQL con un volumen persistente y una API; el proyecto también permite SQLite para desarrollo local y pruebas. La API publica OpenAPI/Swagger en `/docs`. `src/frontend/` contiene el frontend React/PWA canónico; su build de producción está verificado, pero la revisión visual manual contra la pila integrada sigue pendiente.

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

## 6. Estado de RF y evidencia

| RF | Implementación localizada | Evidencia disponible en el repositorio | Brecha documental o de verificación |
|---|---|---|---|
| RF01 Recepción | `api/receptions.py`, modelo `Reception`/`Lot` | `test_recepcion_lote.py`; informe de recepción válida, rechazo de 0 y negativo. | Incorporar resultado, datos y captura/consulta SQL a E05. |
| RF02 Transformación | `api/transformations.py`, `services/transformation.py` | `test_transformacion_salida_trazable.py`; informe del caso 100 kg → 80 kg. | Repetir en la versión final y guardar evidencia de interfaz. |
| RF03 Trazabilidad | `services/traceability.py`, `GET /lots/{id}/traceability` | Prueba descrita desde lote de entrada y salida hasta productor/finca. | Falta medición reproducible con 100 registros. |
| RF04 Alerta | `api/alerts.py`, `services/alerts.py` | `test_merma_y_perdidas.py`, `test_alertas_incompletas_retrasos.py`; merma, campos faltantes y demora configurada devuelven regla y causa. | Pytest local pasa; falta evidencia manual en pantalla para las cuatro categorías. |
| RF05 Indicador económico | `services/economics.py`, `api/economics.py` | Fórmula y límites documentados en backend README. | Falta evidencia del ejemplo con valores modificados y salida cero. |
| RF06 Ficha pública | `api/public.py`, `test_ficha_publica_auditoria_global.py` | Esquema público con campos permitidos para lotes crudos y procesados; prueba de privacidad. | Falta registrar prueba anónima/captura de la versión final. |
| RF07 Persistencia | SQLAlchemy, Alembic, PostgreSQL | Informe de reinicio en base PostgreSQL aislada con conteos comparados. | Falta adjuntar pasos de restauración y comprobación de integridad. |
| RF08 Inventario | `services/inventory.py`, movimientos e idempotencia | Pruebas de exceso, repetición e informe de concurrencia PostgreSQL. | Consolidar comandos, entorno y saldos observados en E05/E07. |
| RF09 Estados | `api/lots.py`, permisos backend | `test_permisos_roles.py`; informe de 403 para operador y motivo obligatorio. | Registrar bloqueo → operación rechazada → ficha pública no disponible. |
| RF10 Auditoria | `models/audit.py`, `api/lots.py`, `api/audit.py`, migracion `e4219b1a7c30` | Actor, fecha, accion, valores anterior/nuevo; consulta global solo admin; guardas ORM y triggers impiden update/delete. | Pruebas API locales; falta guardar evidencia manual de consulta de auditoria en el flujo completo. |
| RF11 Filtros/CSV | `api/inventory.py`, `api/exports.py`, `src/frontend/src/BusinessViews.tsx` | Vista admin filtra por origen/estado y muestra costos por lote; CSV incluye campos requeridos; backend rechaza operador con 403. | Pytest verifica filtros, montos y autorizacion. Falta recorrido visual manual. |
| RF12 Balance | `api/economics.py`, `services/economics.py`, `src/frontend/src/BusinessViews.tsx` | CostEntry unico; formula/unidades/politica visibles; salida/precio cero no divide; UI muestra indicadores. | Pytest reproduce COP 20.000/kg y margen 20 % con COP 1.600.000, 80 kg y COP 25.000/kg. Falta evidencia visual/manual. |

## 7. Entregables documentales

| Entregable | Archivo | Estado actual |
|---|---|---|
| E01 Problema y propuesta de valor | `documentos/E01_problema.md` | Vacío; pendiente de redactar con supuestos y beneficios medibles. |
| E02 Requisitos | `documentos/E02_requisitos.md` | Borrador creado; equipo debe confirmar prioridades y asignar responsables. |
| E03 Diseño | `documentos/E03_diseno.md` | Borrador creado a partir de los modelos y servicios actuales; contrastar contra ejecución final. |
| E04 Producto y código | `backend/`, `src/frontend/` | Backend y frontend canónico disponibles; build frontend verificado. Falta recorrido visual manual integrado en escritorio y móvil. |
| E05 Pruebas | `documentos/E05_pruebas.md`, `tests/casos_manuales.md`, `backend/tests/` | Hay un plan de 15 casos y un ensayo adicional offline; están pendientes de ejecución documentada con esperado, obtenido, estado y evidencia. Las pruebas automatizadas existen, con resultados históricos en el informe. |
| E06 Usabilidad | `documentos/E06_usabilidad.md` | Vacío. Falta prueba real de dos tareas, hallazgos y mejora antes/después. |
| E07 Operación | `documentos/E07_operacion.md`, README | Instrucciones de desarrollo y respaldo redactadas; instalación limpia y restauración aislada siguen sin ejecutarse. |
| E08 IA y fuentes | `documentos/E08_IA_y_fuentes.md` | Existe bitácora; requiere actualizar resultados, revisión humana y componentes de la versión final. |
| E09 Piloto y pitch | `documentos/E09_piloto.md`, `pitch/` | Documento vacío; falta propuesta concreta de precio/costos y presentación de máximo cinco diapositivas. |
| E10 Índice | `ENTREGA.md` | Este borrador; completar con hash final, evidencias y enlaces definitivos. |

## 8. Límites y próximos pasos

1. Recorrer visualmente el frontend en escritorio y móvil contra la API y PostgreSQL, incluida la cola de recepción offline.
2. La instancia Compose observada ya reporta Alembic `b6d1ef3a9204 (head)`; no recrear ni borrar el volumen. La restauración sigue pendiente de probar en una instancia aislada.
3. Completar E01, E06, E07 y E09; ejecutar los 15 casos de E05 y completar sus resultados. Revisar E02 y E03 con el equipo.
4. Ejecutar 15 casos manuales, guardar evidencia, medir trazabilidad con 100 registros y probar backup/restore en base aislada.
5. Documentar la incidencia de CAC001: hora, impacto, decisión, cambio y regresión realmente ejecutados.
6. Confirmar marca, integrantes y responsabilidades; registrar hash y etiqueta final después de congelar y verificar la versión.

La guía oficial pide que la solución funcione en computador y móvil. En esta revisión no hay evidencia suficiente para certificar esa experiencia; la falta de evidencia no equivale a afirmar que la interfaz móvil sea un fallo. El reto también establece un paquete documental de hasta 15 páginas, sin contar pitch ni resultados de pruebas. Una puntuación mínima indicada por la guía no garantiza ganar.

## Actualización técnica: integración de pantallas

Se conectaron las pantallas activas de panel, transformación, trazabilidad, inventario, alertas, economía, auditoría, administración de usuarios y ficha pública con FastAPI. La recepción conserva su cola IndexedDB. Los prototipos que dependían de Dexie/React Router ausentes se archivaron en `src/frontend/design-reference/legacy/`; la interfaz activa no depende de esos módulos.

Verificación ejecutada el 16-10-2026: build PWA `npm run build` exitoso; suite backend 18 aprobadas/1 omitida (concurrencia aparte: 1 aprobada en PostgreSQL temporal); `/health`, `/docs` y frontend respondieron HTTP 200; Alembic actual `b6d1ef3a9204 (head)`. El chequeo HTTP no certifica el recorrido visual. Siguen pendientes las pruebas manuales, la restauración y la medición de rendimiento.
