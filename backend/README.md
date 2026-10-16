# Backend - Cacao con historia

API REST para el MVP del reto de agroindustria. El primer flujo vertical implementado es **productor/finca → recepción → lote → movimiento de inventario → consulta del saldo**. La recepción guarda también el costo de compra y la auditoría en una sola transacción. La documentación interactiva queda en `/docs`.

## Ejecutar localmente

Requiere Python 3.11 o superior.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

## Pruebas automatizadas

Desde `backend/`, instala también las dependencias de desarrollo y ejecuta la suite:

```powershell
pip install -r requirements-dev.txt
python -m pytest -q
```

Las pruebas locales usan una base SQLite temporal aislada; no modifican `cacao.db`. Cubren recepción y cantidades inválidas, transformación 100 kg → 80 kg, lote procesado y vínculo de origen, movimientos atómicos, saldo, merma, trazabilidad, exceso de consumo sin efectos parciales, reintentos idempotentes, permisos y migraciones. La prueba opcional PostgreSQL crea un esquema temporal y comprueba dos consumos concurrentes; configúrala con `TEST_POSTGRES_URL` apuntando a una base aislada cuyo nombre incluya `test`: `python -m pytest tests/test_concurrencia_postgres.py -q`. La prueba offline valida el contrato de reintento del backend; la persistencia local en IndexedDB se prueba aparte en el frontend.

Por defecto usa SQLite en `backend/cacao.db`; el esquema se crea mediante Alembic y los datos sintéticos se cargan al iniciar. API base: `http://localhost:8000/api/v1`; OpenAPI: `http://localhost:8000/docs`; salud: `http://localhost:8000/health`.

## Docker

Desde `backend/`, ejecuta `docker compose up --build db api` para levantar PostgreSQL y la API. El contenedor aplica las migraciones Alembic antes de iniciar la API, disponible en el puerto 8000. PostgreSQL guarda datos en el volumen `postgres_data`.

El servicio frontend usa la aplicación canónica React/PWA en `../src/frontend`. El build de producción está verificado; aún falta recorrer manualmente las vistas administrativas en escritorio y móvil conectadas a una API y PostgreSQL en ejecución.

## Usuarios sintéticos

Con `SEED_DEMO_DATA=true` se crean `admin` / `Admin123!` (rol administrador) y `operador` / `Operador123!` (rol operador), además de CAC001 (Rivera, 100 kg), CAC002 (Campoalegre, 150 kg) y CAC003 (Algeciras, 80 kg). Son credenciales locales de demostración: cambiar o desactivar el sembrado antes de exponer el servicio.

Obtén un JWT enviando formulario `username` y `password` a `POST /api/v1/auth/login`; usa `Authorization: Bearer <token>` para rutas privadas.

## Rutas principales

| Método y ruta | Uso / autorización |
|---|---|
| `POST /api/v1/producers` | Crear productor; operador o administrador |
| `GET /api/v1/auth/me` | Consultar usuario y rol del token |
| `GET /api/v1/farms` | Descargar catálogo de fincas para operadores autenticados |
| `POST /api/v1/farms` | Crear finca asociada a un productor; operador o administrador |
| `POST /api/v1/receptions` | Crear recepción, lote, movimiento, costo de compra y auditoría de forma atómica; admite reintento idempotente |
| `GET /api/v1/lots?origin=&status=` | Filtrar lotes; usuario interno |
| `GET /api/v1/lots/{id}` | Consultar lote y saldo; usuario interno |
| `GET /api/v1/lots/{id}/traceability` | Recorrido y existencia; usuario interno |
| `GET /api/v1/lots/{id}/movements` | Libro de movimientos del lote; usuario interno |
| `GET /api/v1/lots/{id}/audit` | Historial de cambios; administrador |
| `POST /api/v1/transformations` | Registrar una etapa, consumir el lote de entrada y crear el lote procesado junto con su movimiento de producción; operador o administrador |
| `GET /api/v1/alerts` | Alertas calculadas; administrador |
| `GET /api/v1/economics` | Lista de costos unitarios, margenes, formulas y supuestos; administrador |
| `GET /api/v1/economics/{transformation_id}` | Costo y margen; administrador |
| `PATCH /api/v1/lots/products/{output_code}/status` | Liberar, dejar pendiente o bloquear con motivo; administrador |
| `PATCH /api/v1/lots/{id}/status` | Cambiar estado de materia prima u otro lote con motivo; administrador |
| `GET /api/v1/public/products/{code}` | Ficha pública con campos permitidos, sin costos ni datos de contacto |
| `GET /api/v1/exports/lots.csv` | Resumen CSV filtrable; administrador |
| `GET /api/v1/inventory/movements` | Movimientos internos; usuario interno |
| `GET /api/v1/inventory` | Saldo disponible por lote; usuario interno |
| `GET /api/v1/inventory/admin?origin=&status=` | Inventario con costos por lote; solo administrador |

La aplicación canónica React/PWA está en `../src/frontend`. Incluye captura offline de recepciones y vistas administrativas para inventario, CSV, economía y auditoría. El build de producción se debe volver a verificar con `npm run build` desde `src/frontend/`; las pantallas requieren además una revisión visual manual conectadas a la API. Las transformaciones offline no forman parte del alcance.

## Primera demostración en `/docs`

Con el sembrado de demostración activo ya existe un productor con ID `1`. En Swagger UI, inicia sesión en `POST /api/v1/auth/login` como `operador` (`Operador123!`) y pulsa **Authorize** con el token recibido. Luego:

1. Crea una finca con `POST /api/v1/farms`: `{"producer_id":1,"name":"Finca Demo","region":"Rivera"}`. Guarda el `id` de respuesta.
2. Envia `POST /api/v1/receptions` con el `farm_id` del paso anterior; el servidor genera el codigo de lote.

```json
{
  "idempotency_key": "00000000-0000-4000-8000-000000000001",
  "farm_id": 4,
  "received_at": "2026-06-01T09:00:00-05:00",
  "quantity_kg": "100.000",
  "purchase_total_cop": "1200000.00",
  "quality_notes": "Cacao fermentado; dato sintético"
}
```

Cambia `farm_id` por el ID que devolvio el primer paso. El servidor asigna el codigo `CACxxx`; la respuesta incluye `lot_code`, `lot_id` y el saldo disponible. Consulta ese lote con `GET /api/v1/lots/{id}` o `/api/v1/inventory`, revisa sus movimientos en `/api/v1/lots/{id}/movements`, reinicia la API y vuelve a consultarlo. Reenviar la misma recepcion con la misma clave UUID devuelve el registro original; reutilizar la clave con datos distintos da `409`.

## Reglas aplicadas

- Cantidades de recepción y entrada deben ser positivas; no se consume más de la existencia ni se mezclan unidades.
- La clave `idempotency_key` hace que repetir el mismo payload devuelva la transformación original. Si se reutiliza con un payload distinto, la API devuelve `409` y no cambia inventario. Una huella SHA-256 del payload queda guardada para comparar reintentos.
- La operación de transformación, el descuento, los movimientos de consumo y producción, el lote de salida, el costo y la auditoría se guardan en una misma transacción.
- Cada salida positiva crea un lote de producto con código, tipo (`product_type`), unidad, cantidad y estado pendiente. El endpoint conserva el formato histórico de una salida (`output_code`/`output_quantity`) y también acepta una lista `outputs` para dividir el resultado en varios productos; se conserva productor/finca/origen del lote de entrada y `transformation_outputs` enlaza cada lote a su transformación.
- El lote de salida es la fuente autoritativa del código, cantidad y estado; `transformation_outputs` guarda solo la relación. Los campos de salida duplicados se calculan al responder la API y no se almacenan en `transformations`.
- `GET /api/v1/lots/{id}/traceability` recorre el linaje hacia lotes de origen y hacia todos los lotes descendientes. Desde un lote procesado devuelve las entradas anteriores y sus fincas/productores de origen.
- Merma = `(entrada - salida) / entrada * 100`; alerta si supera 15%, como indica el caso. Salida mayor que entrada exige justificar la adición en incidencias.
- `cost_entries` es la fuente única de costos. El costo de compra permanece asociado al lote recibido. El costo de procesamiento se vincula a la transformación y se distribuye entre sus lotes de salida en proporción a la masa, ajustando los centavos restantes en la última salida. El balance suma solo las entradas `processing` de esa transformación y excluye la compra. Costo unitario = costo de etapa / salida vendible; margen = `(precio - costo unitario) / precio * 100`. Salida o precio cero devuelve indicador nulo con explicación.
- Solo administradores cambian estados de producto. La ficha pública usa una lista explícita de campos autorizados y muestra el motivo solo si está bloqueado.
- Bloqueo de materia prima: conserva el saldo y el historial, pero impide consumir el lote en transformaciones hasta que un administrador lo libere. Bloqueo de producto procesado: impide consumirlo en etapas siguientes, y la ficha pública informa `blocked`/`not_available`; solo `released` figura como disponible. Cada cambio requiere motivo y queda auditado. El backend todavía no implementa ventas; cualquier futuro endpoint de venta debe rechazar estados `pending` y `blocked`, permitiendo despacho solo al estado autorizado (`released`).
- La auditoría guarda actor, hora del servidor, acción, entidad y valores anterior/nuevo. El ORM rechaza cambios/eliminaciones; triggers de Alembic bloquean `UPDATE` y `DELETE` por SQL directo en PostgreSQL y SQLite de pruebas. La consulta por lote incluye recepción, consumo, transformaciones y cambios de estado.

## Demostración de transformación y trazabilidad

Después de crear una recepción de 100 kg, toma su `lot_id` y envía una transformación autenticado como operador:

```json
{
  "idempotency_key": "transform-demo-0001",
  "lot_id": 1,
  "stage": "secado",
  "occurred_at": "2026-06-01T12:00:00Z",
  "input_quantity": 100,
  "output_quantity": 80,
  "unit": "kg",
  "output_code": "DRY001",
  "product_type": "dried_cocoa",
  "costs_cop": 200000
}
```

La respuesta incluye `outputs` con el identificador del nuevo lote. La entrada queda con 0 kg disponibles y 100 kg consumidos; `DRY001` queda con 80 kg disponibles. La API guarda el movimiento `consumption` en la entrada, `production` en la salida, la relación de origen y la transformación en una transacción. Consulta `/api/v1/lots/{id}/traceability` primero con el ID de entrada y después con el de salida: desde la entrada verás el descendiente `DRY001`; desde la salida verás la entrada original y su productor/finca. La diferencia de 20 kg equivale a una merma del 20%, por lo que aparece una alerta al consultar `/api/v1/alerts` como administrador.

## Persistencia y respaldo

En local, detén la API y copia `cacao.db` para respaldo; restaura la copia en la misma ruta antes del siguiente inicio. En Docker: `docker compose exec -T db pg_dump -U cacao cacao > respaldo.sql`; para restaurar usa `docker compose exec -T db psql -U cacao cacao < respaldo.sql`. No guardes respaldos reales en el repositorio.

## Configuración y alcance actual

Las variables se leen desde `.env` o entorno (`DATABASE_URL`, `SECRET_KEY`, `ACCESS_TOKEN_MINUTES`, `SEED_DEMO_DATA`, `CORS_ORIGINS`). Cambia `SECRET_KEY`, contraseñas y credenciales de PostgreSQL para despliegues; desactiva el sembrado en instalaciones reales. El alcance actual permite un lote de entrada por transformación y persiste el lote procesado de salida. El vínculo de salida admite ampliación a más de un producto; no se admiten varias entradas en una operación. Restricciones de retirada, ventas y publicación administrada del perfil público siguen siendo etapas posteriores. Los registros y productores de demostración son sintéticos.

Las revisiones `c2a7f4b89d10` y `d843a91c5e2b` materializan lotes de salida y guardan la huella de idempotencia. `e4219b1a7c30` migra costos históricos a `cost_entries`, conserva el monto que exponía la API económica anterior, elimina `finance_records` y `transformations.costs_cop`, y retira de `transformations` y `transformation_outputs` las cantidades/estados/códigos duplicados de las salidas. También añade protección inmutable a auditoría. Las pruebas Alembic verifican upgrade/downgrade/upgrade, conservación de datos, costo legado y bloqueo SQL update/delete en SQLite temporal. No se ejecutaron migraciones sobre la base activa.

## Pantallas conectadas con backend

La PWA can�nica est� en `../src/frontend`. Incluye captura offline de recepciones y vistas conectadas a FastAPI para panel, transformaci�n, trazabilidad, inventario, alertas, econom�a, auditor�a, usuarios y ficha p�blica. Transformaciones y cambios de estado requieren conexi�n; no se guardan como operaciones offline. Los prototipos importados se conservan en `design-reference/legacy` y no forman parte del build.

Rutas incorporadas: `GET/POST/PATCH /api/v1/users` (solo administrador), `GET /api/v1/transformations` (usuario interno) y `GET /api/v1/analytics/dashboard` (solo administrador). El correo de usuario se guarda en el campo `username` para mantener el contrato de autenticaci�n actual. Municipios permitidos: Rivera, Campoalegre y Algeciras. La revisi�n `b6d1ef3a9204` agrega `users.municipality` nullable. No se ejecut� esta nueva migraci�n sobre PostgreSQL persistente.

`LOSS_ALERT_THRESHOLD_PERCENT` configura la alerta de merma (15 por defecto). La alerta de costo est� desactivada salvo que se configure `COST_ALERT_THRESHOLD_COP_PER_KG`.

La ficha p�blica tambi�n cuenta con `GET /api/v1/public/products/{code}/traceability`, que devuelve una l�nea temporal con lista permitida de origen, etapas, cantidades y fechas; omite datos privados y financieros. La respuesta de `POST /api/v1/transformations` incluye porcentaje y alerta de merma calculados con la misma configuraci�n del endpoint `/alerts`.
