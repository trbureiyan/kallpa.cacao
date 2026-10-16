# E08 - IA y fuentes

## Cambios en la captura offline y su sincronizacion

- Herramienta: ChatGPT (OpenAI), agente de codigo.
- Proposito: consolidar la PWA en `src/frontend/`, corregir la actualizacion de recepciones en conflicto y asignar el codigo legible del lote en el servidor al sincronizar.
- Archivos afectados: `src/frontend/`, `backend/app/api/receptions.py`, `backend/app/schemas/api.py`, `backend/docker-compose.yml`, `backend/README.md`, `README.md`, `tests/backend/integration/test_offline_receptions.py`.
- Revision humana requerida: comprobar la asignacion de codigos `CACxxx`, los reintentos idempotentes, la correccion de conflictos y el flujo de captura sin red antes de la demostracion.

## Dependencias existentes del frontend

No se agregaron dependencias. Se trasladaron las dependencias ya presentes en `frontend/package-lock.json` a `src/frontend/package-lock.json`, fijando sus versiones exactas. Fuentes y licencias declaradas por los paquetes: React y React DOM 19.3.1 (MIT), Vite 6.4.4 (MIT), `@vitejs/plugin-react` 4.7.0 (MIT), `vite-plugin-pwa` 0.21.2 (MIT), `idb` 8.0.4 (ISC) y `lucide-react` 0.468.0 (ISC). Fuentes de version y licencia: https://www.npmjs.com/package/react, https://www.npmjs.com/package/react-dom, https://www.npmjs.com/package/vite, https://www.npmjs.com/package/@vitejs/plugin-react, https://www.npmjs.com/package/vite-plugin-pwa, https://www.npmjs.com/package/idb y https://www.npmjs.com/package/lucide-react.

## Suite inicial de pruebas automatizadas del backend

- Herramienta: ChatGPT (OpenAI), agente de codigo.
- Proposito: agregar verificaciones Pytest para recepciones, cantidades invalidas, calculo/alerta de merma, idempotencia de recepciones reenviadas desde el flujo offline, permisos por rol y migraciones Alembic.
- Archivos afectados: `backend/tests/`, `backend/requirements-dev.txt`, `backend/README.md`.
- Dependencias agregadas para desarrollo: Pytest y HTTPX, declaradas por separado de las dependencias de ejecucion de la API.
- Revision humana requerida: confirmar la correspondencia de cada caso con el RF oficial, especialmente el umbral de merma y RF08/RF09. La prueba idempotente valida el contrato del servidor al reintentar una captura; no automatiza IndexedDB ni sustituye una prueba de navegador sin red.
- Resultado observado: `python -m pytest -q` completo con 9 pruebas aprobadas. La version instalada de Starlette emitio una advertencia de deprecacion sobre su TestClient y HTTPX; no fallo ninguna prueba.

## Control manual de sincronizacion para ensayos de campo

- Herramienta: ChatGPT (OpenAI), agente de codigo.
- Proposito: permitir pausar/reanudar el envio automatico desde la interfaz y dejar recepciones visiblemente en cola durante una demostracion, incluso cuando el navegador puede seguir accediendo a servicios locales por `localhost`.
- Archivos afectados: `src/frontend/src/App.tsx`.
- Revision humana requerida: comprobar en el navegador el cambio de estados Pendiente/Sincronizado, la persistencia de la pausa tras recargar y el reenvio al reanudar. El control pausa la sincronizacion de la aplicacion; no desconecta el dispositivo ni reemplaza el ensayo real con DevTools/PWA sin red.

## Revision de estado y plan de verificacion

- Herramienta: ChatGPT (OpenAI), agente de codigo.
- Proposito: contrastar los RF indicados con la implementacion, ejecutar comprobaciones automatizadas y de lectura contra la pila local, y documentar brechas y siguientes pasos.
- Archivos afectados: `concurso/Revision_funcional_y_plan_siguiente.txt`, `documentos/E08_IA_y_fuentes.md`.
- Revision humana requerida: revisar el estado de cada RF con el equipo y repetir las pruebas manuales en un entorno de datos descartable; no se hicieron escrituras ni reinicios sobre la base PostgreSQL activa.
- Resultado observado: 9 pruebas Pytest aprobadas, build frontend exitoso, API/frontend/PostgreSQL activos, Alembic en head, login de ambos roles, control de acceso 403 y CSV disponible. Las transformaciones solo se verificaron en la base aislada de pruebas; no se ensayaron desconexion real ni reinicio completo con recuperacion de datos.

## Lotes de salida y trazabilidad de transformaciones

- Herramienta: ChatGPT (OpenAI), agente de codigo.
- Proposito: completar el flujo desde la recepcion de materia prima hasta un lote procesado, conservando su origen y sus movimientos.
- Archivos afectados: `backend/app/models/lot.py`, `backend/app/models/transformation_output.py`, `backend/app/models/__init__.py`, `backend/app/schemas/api.py`, `backend/app/services/transformation.py`, `backend/app/services/traceability.py`, `backend/app/api/lots.py`, `backend/app/api/public.py`, `backend/app/api/inventory.py`, `backend/migrations/versions/c2a7f4b89d10_materialize_transformation_output_lots.py`, `backend/tests/test_transformacion_salida_trazable.py`, `backend/tests/test_migraciones_alembic.py`, `backend/README.md`.
- Proposito tecnico: persistir tipo de producto y relacion transformacion-salida; crear uno o varios lotes, consumo, produccion, costos y auditoria en una transaccion; recorrer trazabilidad aguas arriba y aguas abajo. La migracion nueva tambien materializa salidas positivas de transformaciones anteriores.
- Verificacion: `python -m pytest -q` desde `backend/`: 12 pruebas aprobadas. Incluye recepcion de 100 kg, transformacion a 80 kg, varias salidas, saldos, movimientos, alerta del 20%, trazabilidad a productor/origen, reintento idempotente, rollback por colision de codigo y migracion con datos previos en SQLite temporal.
- Revision humana requerida: probar API y migracion en una base de ensayo respaldada antes de actualizar la base de datos existente. No se aplico la migracion a la base PostgreSQL activa ni se reiniciaron los contenedores.

## Idempotencia, bloqueo y concurrencia del inventario

- Herramienta: ChatGPT (OpenAI), agente de codigo.
- Proposito: definir reintentos de transformacion sin ambiguedad, impedir operaciones parciales con stock insuficiente, bloquear consumo de materia prima/productos restringidos y probar bloqueo de fila concurrente en PostgreSQL.
- Archivos afectados: `backend/app/models/transformation.py`, `backend/app/schemas/api.py`, `backend/app/services/transformation.py`, `backend/app/api/lots.py`, `backend/app/api/public.py`, `backend/migrations/versions/d843a91c5e2b_transformation_idempotency_fingerprint.py`, `backend/tests/test_transformacion_salida_trazable.py`, `backend/tests/test_permisos_roles.py`, `backend/tests/test_concurrencia_postgres.py`, `backend/tests/test_migraciones_alembic.py`, `backend/README.md`.
- Regla de idempotencia: mismo `idempotency_key` y mismo payload devuelve el resultado previo; la misma clave con payload distinto responde HTTP 409. Los cambios de payload nunca vuelven a consumir inventario.
- Regla de bloqueo: el bloqueo conserva el saldo y el historial, pero impide transformar el lote hasta su liberacion administrativa con motivo. Un producto procesado bloqueado muestra `not_available`; solo el estado `released` indica disponibilidad publica. Aun no hay endpoint de ventas, por lo que no se registra ni se puede ensayar despacho de ventas.
- Verificacion: suite local `python -m pytest -q`: 14 aprobadas y una prueba PostgreSQL omitida si falta `TEST_POSTGRES_URL`. Aparte, la prueba concurrente paso (`1 passed`) en un contenedor PostgreSQL 16 desechable, una base/schema de prueba aislados y sin volumen persistente. En la carrera de dos consumos de 7 kg contra 10 kg, uno tuvo exito, el otro recibio 409 y el saldo final fue 3 kg.
- Revision humana requerida: migrar una instancia de ensayo respaldada antes de actualizar la base PostgreSQL persistente del proyecto. No se aplicaron migraciones ni se escribieron datos en esa base activa. Revisar la advertencia existente deprecacion TestClient/HTTPX; no afecta el resultado de las pruebas.

## Vistas de inventario, alertas, economia y ficha publica

- Herramienta: ChatGPT (OpenAI), agente de codigo.
- Proposito: extender la PWA React para cubrir los recorridos visuales de inventario, filtros, exportacion CSV, alertas explicadas, indicadores economicos, consulta publica y cambio administrativo de estados.
- Archivos afectados: `src/frontend/src/App.tsx`, `src/frontend/src/api.ts`, `src/frontend/src/BusinessViews.tsx`, `src/frontend/src/styles.css`, `src/frontend/README.md`, `backend/app/api/economics.py`, `backend/README.md`.
- Comportamiento: operadores autenticados consultan/filtran inventario; solo el administrador ve exportacion y controles de estado. Las alertas y la economia solo aparecen en navegacion admin y sus endpoints siguen usando `admin_only`. La ficha publica no necesita token, acepta el enlace `?producto=CODIGO`, no expone costos/contactos y comunica disponibilidad segun estado.
- Resultado observado: `npm run build` desde `src/frontend/` completo TypeScript y Vite y genero los recursos PWA. No se hizo una prueba visual manual en navegador ni se probaron llamadas contra la API desplegada en esta tarea.
- Revision humana requerida: ensayar pantallas en escritorio y movil con los dos roles, probar CSV/filtros, y verificar que operador reciba 403 si invoca directamente rutas administrativas. La seguridad depende del backend, aunque el frontend oculte los controles.


## Costos, auditoria y panel administrativo

- Herramienta: ChatGPT (OpenAI), agente de codigo.
- Proposito: consolidar `CostEntry` como fuente unica de costos; proteger eventos de auditoria frente a edicion/eliminacion; exponer inventario filtrable con costos solo a administradores; completar vistas de inventario, economia, CSV y auditoria en el frontend canonico.
- Archivos afectados: migracion `backend/migrations/versions/e4219b1a7c30_canonical_cost_entries_and_immutable_audit.py`; modelos y servicios de costos/auditoria; endpoints de economia, alertas, exportaciones, inventario y lotes; pruebas backend; `src/frontend/`; README, E02, E03, E05 y ENTREGA.
- Decision aplicada: el costo de compra permanece asociado al lote recibido; el costo de procesamiento se distribuye por masa entre las salidas y es el unico que integra el costo unitario de etapa. El precio propuesto se conserva en `Transformation`. La migracion copia valores economicos historicos antes de retirar columnas/tablas duplicadas.
- Fuente del producto: `Lot` conserva codigo, cantidad y estado; `TransformationOutput` mantiene solo la relacion. La API mantiene los campos de respuesta calculandolos desde los lotes. La migracion retira las copias persistidas y el test comprueba upgrade/downgrade/upgrade.- Seguridad de auditoria: listener ORM y triggers de base impiden `UPDATE` y `DELETE`; los eventos incluyen actor y valores anterior/nuevo en los flujos cubiertos. La migracion se valido en una base SQLite temporal mediante upgrade/downgrade/upgrade, no en PostgreSQL persistente.
- Prueba PostgreSQL de la migracion: en PostgreSQL 16 temporal, upgrade desde `d843a91c5e2b`, validacion de datos y triggers append-only, downgrade con restauracion de valores legacy y upgrade final a head. Se uso `tmpfs` y se elimino el contenedor; la base persistente del proyecto no fue tocada.
- Resultado observado: `python -m pytest -q` desde `backend/`: 18 aprobadas, 1 omitida (prueba PostgreSQL opcional sin `TEST_POSTGRES_URL`), 1 advertencia deprecada de Starlette/TestClient. `npm run build` desde `src/frontend/`: correcto; TypeScript y Vite generaron build PWA.
- Dependencias: no se instalaron paquetes nuevos; se fijaron y reconciliaron en el lockfile versiones ya presentes en la copia frontend del mismo proyecto.
- Revision humana requerida: revisar la semantica de costo de etapa frente al reto, recorrer pantallas en escritorio/movil y probar la migracion en PostgreSQL aislado con respaldo antes de usarla en datos persistentes. No aplicar esta migracion a la base activa sin respaldo y validacion del equipo.

## Integración de pantallas de campo y administración con la API

- Herramienta: ChatGPT (OpenAI), agente de código.
- Propósito: convertir pantallas importadas que dependían de estado simulado o IndexedDB en vistas de la aplicación canónica conectadas a FastAPI. La recepción conserva la cola offline existente; transformación, inventario, usuarios, estados, auditoría, alertas, analítica y ficha pública usan el servidor.
- Archivos afectados: `src/frontend/src/App.tsx`, `src/frontend/src/api.ts`, `src/frontend/src/BusinessViews.tsx`, `src/frontend/src/WorkspaceViews.tsx`, `src/frontend/src/UsersView.tsx`, `src/frontend/src/styles.css`, `src/frontend/design-reference/legacy/`; `backend/app/api/users.py`, `backend/app/api/analytics.py`, `backend/app/api/alerts.py`, `backend/app/api/transformations.py`, `backend/app/services/alerts.py`, `backend/app/services/analytics.py`, `backend/app/services/transformation.py`, `backend/app/models/user.py`, `backend/app/schemas/api.py`, `backend/app/config.py`, `backend/app/main.py`, `backend/migrations/versions/b6d1ef3a9204_add_user_municipality.py`, `backend/README.md`.
- Comportamiento: login usa el endpoint real; los accesos demo solo rellenan credenciales locales sembradas. El backend valida los permisos. La ficha pública usa el esquema público y no expone costos ni datos privados del productor.
- Dependencias: no se instalaron paquetes.
- Verificación observada: `npm run build` desde `src/frontend/` completó TypeScript, Vite y PWA. `python -m compileall -q app`, la importación de FastAPI y `alembic heads` desde `backend/` completaron; el head observado es `b6d1ef3a9204`. No se ejecutaron pruebas Pytest ni se aplicó esta migración a PostgreSQL persistente. No se hizo recorrido manual en navegador contra la API.
- Revisión humana requerida: probar la migración en una base de ensayo respaldada antes de activar la API contra datos persistentes; revisar creación/desactivación de usuarios y municipio asociado; recorrer las vistas en escritorio/móvil y verificar que el operador reciba 403 en rutas administrativas. Confirmar que las consultas analíticas representan las reglas aceptadas por el equipo.

Ajuste de alcance de esta implementaciÃ³n: `src/frontend/src/db.ts` ahora guarda el cÃ³digo legible que devuelve el servidor al sincronizar una recepciÃ³n; antes de ese momento la interfaz muestra una referencia local pendiente, porque el contrato genera el cÃ³digo CAC en FastAPI. TambiÃ©n se agregaron `GET /public/products/{code}/traceability` y la alerta de merma en la respuesta de transformaciÃ³n. No se requiere instalar una biblioteca QR; la ficha comparte un enlace directo con el cÃ³digo del producto.
