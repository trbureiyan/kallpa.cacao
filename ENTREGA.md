# E10 - Índice de entrega y estado del producto

**Borrador de trabajo, no versión final.** Actualizado el 16 de octubre de 2026. Este documento describe la solución observada en el repositorio y diferencia implementación de evidencia. No declara una función probada solo porque exista código o una pantalla.

## 1. Identificación y acceso

- Repositorio: [trbureiyan/kallpa.cacao](https://github.com/trbureiyan/kallpa.cacao).
- Rama consultada: `backend`.
- Hash de referencia consultado: `ac28407753288d5d4f490fe17b6cd94849e58058`. No está identificado como commit final ni como etiqueta de entrega.
- Nombre: el repositorio se llama `kallpa.cacao`; la interfaz se ha denominado `AgroCacao Huila`. El equipo debe acordar la marca que usará en la presentación.
- Equipo registrado en el marco de planificación: Graffe (David), Alejandro, Brayan y Emanuel. Confirmar nombres completos y responsabilidades antes de entregar.
- Usuarios de demostración sembrados localmente: `operador` / `Operador123!` y `admin` / `Admin123!`. Son credenciales ficticias de desarrollo; no usarlas en un servicio público.

## 2. Qué hace la solución

El backend permite registrar productores y fincas, recibir cacao en un lote, registrar transformaciones y lotes de salida, consultar existencias y trazabilidad, cambiar estados con autorización, calcular alertas de merma y datos económicos, publicar una ficha de producto y exportar lotes a CSV.

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

Validacion realizada en esta revision: desde `backend/`, `python -m pytest -q` termino con 18 pruebas aprobadas, 1 omitida (prueba de concurrencia PostgreSQL sin `TEST_POSTGRES_URL`) y 1 advertencia deprecada de Starlette/TestClient. Desde `src/frontend/`, `npm run build` termino correctamente con TypeScript y Vite. No se ejecutaron migraciones ni pruebas manuales contra la base persistente del proyecto.

## 6. Estado de RF y evidencia

| RF | Implementación localizada | Evidencia disponible en el repositorio | Brecha documental o de verificación |
|---|---|---|---|
| RF01 Recepción | `api/receptions.py`, modelo `Reception`/`Lot` | `test_recepcion_lote.py`; informe de recepción válida, rechazo de 0 y negativo. | Incorporar resultado, datos y captura/consulta SQL a E05. |
| RF02 Transformación | `api/transformations.py`, `services/transformation.py` | `test_transformacion_salida_trazable.py`; informe del caso 100 kg → 80 kg. | Repetir en la versión final y guardar evidencia de interfaz. |
| RF03 Trazabilidad | `services/traceability.py`, `GET /lots/{id}/traceability` | Prueba descrita desde lote de entrada y salida hasta productor/finca. | Falta medición reproducible con 100 registros. |
| RF04 Alerta | `api/alerts.py` | `test_merma_y_perdidas.py`; prueba documentada de 20 % frente a 15 %. | Guardar evidencia de la regla y causa que ve el usuario. |
| RF05 Indicador económico | `services/economics.py`, `api/economics.py` | Fórmula y límites documentados en backend README. | Falta evidencia del ejemplo con valores modificados y salida cero. |
| RF06 Ficha pública | `api/public.py` | Esquema público con lista de campos permitidos; prueba de privacidad descrita. | Falta registrar prueba anónima/captura de la versión final. |
| RF07 Persistencia | SQLAlchemy, Alembic, PostgreSQL | Informe de reinicio en base PostgreSQL aislada con conteos comparados. | Falta adjuntar pasos de restauración y comprobación de integridad. |
| RF08 Inventario | `services/inventory.py`, movimientos e idempotencia | Pruebas de exceso, repetición e informe de concurrencia PostgreSQL. | Consolidar comandos, entorno y saldos observados en E05/E07. |
| RF09 Estados | `api/lots.py`, permisos backend | `test_permisos_roles.py`; informe de 403 para operador y motivo obligatorio. | Registrar bloqueo → operación rechazada → ficha pública no disponible. |
| RF10 Auditoría | `models/audit.py`, `api/lots.py`, migración `e4219b1a7c30` | Actor/nombre, hora, acción y valores anterior/nuevo; guardas ORM y triggers impiden update/delete; eventos en recepción, transformación y estado. | Pruebas API y migración SQLite temporal pasan. Falta ensayo/captura manual PostgreSQL de entrega. |
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
| E07 Operación | `documentos/E07_operacion.md`, README | Parcial: comandos existentes; instalación limpia y restauración deben probarse y registrarse. |
| E08 IA y fuentes | `documentos/E08_IA_y_fuentes.md` | Existe bitácora; requiere actualizar resultados, revisión humana y componentes de la versión final. |
| E09 Piloto y pitch | `documentos/E09_piloto.md`, `pitch/` | Documento vacío; falta propuesta concreta de precio/costos y presentación de máximo cinco diapositivas. |
| E10 Índice | `ENTREGA.md` | Este borrador; completar con hash final, evidencias y enlaces definitivos. |

## 8. Límites y próximos pasos

1. Recorrer visualmente el frontend en escritorio y móvil contra la API y PostgreSQL, incluida la cola de recepción offline.
2. Aplicar la migración `e4219b1a7c30` únicamente en una base de ensayo respaldada; no se ha ejecutado sobre la base persistente del proyecto.
3. Completar E01, E06, E07 y E09; ejecutar los 15 casos de E05 y completar sus resultados. Revisar E02 y E03 con el equipo.
4. Ejecutar 15 casos manuales, guardar evidencia, medir trazabilidad con 100 registros y probar backup/restore en base aislada.
5. Documentar la incidencia de CAC001: hora, impacto, decisión, cambio y regresión realmente ejecutados.
6. Confirmar marca, integrantes y responsabilidades; registrar hash y etiqueta final después de congelar y verificar la versión.

La guía oficial pide que la solución funcione en computador y móvil. En esta revisión no hay evidencia suficiente para certificar esa experiencia; la falta de evidencia no equivale a afirmar que la interfaz móvil sea un fallo. El reto también establece un paquete documental de hasta 15 páginas, sin contar pitch ni resultados de pruebas. Una puntuación mínima indicada por la guía no garantiza ganar.
