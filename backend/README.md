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

El archivo Compose también define un servicio frontend en `http://localhost:8080`, pero la fuente de `src/frontend/` está incompleta en esta rama (el punto de entrada y `package.json` están vacíos). Por eso, el comando de pila completa `docker compose up --build` no se considera una instalación verificada desde esta copia. Para demostrar la PWA, use la rama/copia que contenga su fuente completa y documente el commit correspondiente.

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

La aplicación contempla una PWA React para captura offline de recepciones y vistas online. Sin embargo, la fuente frontend no está completa en esta rama y esas funciones no pueden verificarse aquí. El informe de revisión conserva resultados anteriores de build y del ensayo offline; no los trate como una verificación de este commit. Las transformaciones offline no forman parte del alcance comprobado.

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
- `GET /api/v1/lots/{id}/traceability` recorre el linaje hacia lotes de origen y hacia todos los lotes descendientes. Desde un lote procesado devuelve las entradas anteriores y sus fincas/productores de origen.
- Merma = `(entrada - salida) / entrada * 100`; alerta si supera 15%, como indica el caso. Salida mayor que entrada exige justificar la adición en incidencias.
- Costo unitario = costo total informado / salida vendible. Margen = `(precio - costo unitario) / precio * 100`; se omite si salida o precio son cero. El costo es una cifra agregada informada; aún no se desglosa por categorías.
- Solo administradores cambian estados de producto. La ficha pública usa una lista explícita de campos autorizados y muestra el motivo solo si está bloqueado.
- Bloqueo de materia prima: conserva el saldo y el historial, pero impide consumir el lote en transformaciones hasta que un administrador lo libere. Bloqueo de producto procesado: impide consumirlo en etapas siguientes, y la ficha pública informa `blocked`/`not_available`; solo `released` figura como disponible. Cada cambio requiere motivo y queda auditado. El backend todavía no implementa ventas; cualquier futuro endpoint de venta debe rechazar estados `pending` y `blocked`, permitiendo despacho solo al estado autorizado (`released`).
- La auditoría conserva actor, fecha, acción y valores antes/después; no existe ruta para borrar eventos.

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

Las revisiones `c2a7f4b89d10` y `d843a91c5e2b` agregan lotes de salida, `product_type` y la huella de idempotencia; la primera materializa las salidas positivas históricas. Las pruebas de migración usan SQLite temporal. Antes de actualizar una base con datos reales, crea un respaldo y aplica las migraciones en un entorno de ensayo; no se ejecutaron migraciones sobre la base activa.
