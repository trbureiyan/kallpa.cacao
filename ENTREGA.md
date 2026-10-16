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

El backend usa FastAPI, SQLAlchemy y Alembic. Docker Compose configura PostgreSQL con un volumen persistente y una API; el proyecto también permite SQLite para desarrollo local y pruebas. La API publica OpenAPI/Swagger en `/docs`. El código frontend de React/TypeScript no está completo en esta rama: `src/frontend/src/App.tsx`, `src/frontend/src/main.tsx` y `src/frontend/package.json` están vacíos. Compose intenta construir ese frontend, por lo que el arranque de la pila completa no es reproducible desde esta copia hasta recuperar sus fuentes.

Los modelos principales son `User`, `Producer`, `Farm`, `Lot`, `Reception`, `Transformation`, `TransformationOutput`, `InventoryMovement`, `CostEntry`, `FinanceRecord` y `AuditEvent`. El diagrama y las decisiones del esquema están en [E03](documentos/E03_diseno.md); las historias y criterios están en [E02](documentos/E02_requisitos.md).

La implementación actual conserva algunas representaciones duplicadas: la cantidad inicial y la finca aparecen en `Lot` y `Reception`; importes se guardan en `Transformation.costs_cop`, `FinanceRecord` y `CostEntry`; algunos datos de salida y estado también aparecen tanto en `Transformation` como en el lote de salida. La documentación no debe presentar una fuente única de esos valores hasta que se resuelva esa duplicación. La auditoría almacena actor, fecha, acción y valores anterior/nuevo; no existe trigger PostgreSQL documentado que impida modificar o borrar eventos, así que la inmutabilidad estricta está pendiente.

## 4. Reglas visibles para evaluación

- Recepción: cantidad positiva, unidad explícita e identificador de lote único. La clave idempotente permite reintentar una operación sin crear otra recepción.
- Transformación: comprueba lote, estado, stock y unidad; el consumo y la creación de salidas/movimientos se hacen en una transacción. Misma clave y mismo contenido devuelve el resultado previo; misma clave con contenido diferente produce conflicto.
- Merma: `(entrada - salida) / entrada × 100`. La alerta de merma del caso se activa si supera estrictamente 15 %.
- Economía: el servicio usa `costo total informado / cantidad de salida vendible`; margen sobre venta = `(precio - costo unitario) / precio × 100`. Salida o precio igual a cero produce indicador no calculable. El costo aparece agregado; el esquema aún no garantiza un desglose canónico.
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

El último resultado escrito en `concurso/Revision_funcional_y_plan_siguiente.txt` es 14 pruebas aprobadas y una omitida en la ejecución normal; la prueba de concurrencia PostgreSQL se ejecutó aparte y pasó en un PostgreSQL desechable. El informe también registra una compilación frontend y una prueba manual de recepción offline. No se ejecutaron esas verificaciones al preparar este documento. Verifique todo nuevamente sobre el commit final.

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
| RF10 Auditoría | `models/audit.py`, escritura desde recepción/transformación/estado | Eventos con actor, acción y valores anterior/nuevo en el modelo. | Demostrar cambios relevantes y resolver la protección de borrado a nivel PostgreSQL. |
| RF11 Filtros/CSV | `api/lots.py`, `api/exports.py` | Rutas documentadas para filtrar y exportar. | Guardar CSV de prueba y verificar columnas y rol administrador. |
| RF12 Balance | `api/economics.py`, `services/economics.py` | Fórmula, valores no calculables y costos incluidos descritos. | Guardar prueba del ejemplo oficial (20.000 COP/kg y 20 %) con supuestos visibles. |

## 7. Entregables documentales

| Entregable | Archivo | Estado actual |
|---|---|---|
| E01 Problema y propuesta de valor | `documentos/E01_problema.md` | Vacío; pendiente de redactar con supuestos y beneficios medibles. |
| E02 Requisitos | `documentos/E02_requisitos.md` | Borrador creado; equipo debe confirmar prioridades y asignar responsables. |
| E03 Diseño | `documentos/E03_diseno.md` | Borrador creado a partir de los modelos y servicios actuales; contrastar contra ejecución final. |
| E04 Producto y código | `backend/`, `src/frontend/` | Backend disponible; frontend incompleto en esta rama. No declarar flujo de UI completo. |
| E05 Pruebas | `documentos/E05_pruebas.md`, `tests/casos_manuales.md`, `backend/tests/` | Hay un plan de 15 casos y un ensayo adicional offline; están pendientes de ejecución documentada con esperado, obtenido, estado y evidencia. Las pruebas automatizadas existen, con resultados históricos en el informe. |
| E06 Usabilidad | `documentos/E06_usabilidad.md` | Vacío. Falta prueba real de dos tareas, hallazgos y mejora antes/después. |
| E07 Operación | `documentos/E07_operacion.md`, README | Parcial: comandos existentes; instalación limpia y restauración deben probarse y registrarse. |
| E08 IA y fuentes | `documentos/E08_IA_y_fuentes.md` | Existe bitácora; requiere actualizar resultados, revisión humana y componentes de la versión final. |
| E09 Piloto y pitch | `documentos/E09_piloto.md`, `pitch/` | Documento vacío; falta propuesta concreta de precio/costos y presentación de máximo cinco diapositivas. |
| E10 Índice | `ENTREGA.md` | Este borrador; completar con hash final, evidencias y enlaces definitivos. |

## 8. Límites y próximos pasos

1. Recuperar/integrar el frontend completo en una rama que lo incluya y verificar la PWA; esta rama no permite construirla actualmente.
2. Resolver duplicaciones de costos, cantidades/estados y la protección de auditoría antes de describir esos datos como fuente única o inmutable.
3. Completar E01, E06, E07 y E09; ejecutar los 15 casos de E05 y completar sus resultados. Revisar E02 y E03 con el equipo.
4. Ejecutar 15 casos manuales, guardar evidencia, medir trazabilidad con 100 registros y probar backup/restore en base aislada.
5. Documentar la incidencia de CAC001: hora, impacto, decisión, cambio y regresión realmente ejecutados.
6. Confirmar marca, integrantes y responsabilidades; registrar hash y etiqueta final después de congelar y verificar la versión.

La guía oficial pide que la solución funcione en computador y móvil. En esta revisión no hay evidencia suficiente para certificar esa experiencia; la falta de evidencia no equivale a afirmar que la interfaz móvil sea un fallo. El reto también establece un paquete documental de hasta 15 páginas, sin contar pitch ni resultados de pruebas. Una puntuación mínima indicada por la guía no garantiza ganar.
