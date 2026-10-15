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

Por defecto usa SQLite en `backend/cacao.db`; el esquema se crea mediante Alembic y los datos sintéticos se cargan al iniciar. API base: `http://localhost:8000/api/v1`; OpenAPI: `http://localhost:8000/docs`; salud: `http://localhost:8000/health`.

## Docker

Desde `backend/` ejecuta `docker compose up --build`. El contenedor aplica las migraciones Alembic antes de iniciar la API, disponible en el puerto 8000. PostgreSQL guarda datos en el volumen `postgres_data`.

Compose también construye la PWA React en `http://localhost:8080`. Para desarrollo del frontend por separado, consulta [frontend/README.md](../frontend/README.md); Vite corre en `http://localhost:5173`, origen incluido en CORS.

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
| `POST /api/v1/transformations` | Registrar una etapa y consumir inventario; operador o administrador |
| `GET /api/v1/alerts` | Alertas calculadas; administrador |
| `GET /api/v1/economics/{transformation_id}` | Costo y margen; administrador |
| `PATCH /api/v1/lots/products/{output_code}/status` | Liberar, dejar pendiente o bloquear con motivo; administrador |
| `GET /api/v1/public/products/{code}` | Ficha pública con campos permitidos, sin costos ni datos de contacto |
| `GET /api/v1/exports/lots.csv` | Resumen CSV filtrable; administrador |
| `GET /api/v1/inventory/movements` | Movimientos internos; usuario interno |
| `GET /api/v1/inventory` | Saldo disponible por lote; usuario interno |

La interfaz web implementa captura offline de recepciones. La app debe abrirse con conexión una primera vez para iniciar sesión y almacenar el catálogo de fincas. Los formularios luego se guardan en IndexedDB y se reenvían con clave idempotente cuando hay conexión; las transformaciones offline todavía no están habilitadas.

## Primera demostración en `/docs`

Con el sembrado de demostración activo ya existe un productor con ID `1`. En Swagger UI, inicia sesión en `POST /api/v1/auth/login` como `operador` (`Operador123!`) y pulsa **Authorize** con el token recibido. Luego:

1. Crea una finca con `POST /api/v1/farms`: `{"producer_id":1,"name":"Finca Demo","region":"Rivera"}`. Guarda el `id` de respuesta.
2. Envía `POST /api/v1/receptions` con un código de lote nuevo y ese `farm_id`, por ejemplo:

```json
{
  "idempotency_key": "recepcion-demo-0001",
  "lot_code": "CAC-DEMO-001",
  "farm_id": 4,
  "received_at": "2026-06-01T09:00:00-05:00",
  "quantity_kg": "100.000",
  "purchase_total_cop": "1200000.00",
  "quality_notes": "Cacao fermentado; dato sintético"
}
```

Sustituye `farm_id` por el ID que devolvió el primer paso. La respuesta incluye `lot_id` y el saldo disponible. Consulta ese lote con `GET /api/v1/lots/{id}` o `/api/v1/inventory`, revisa sus movimientos en `/api/v1/lots/{id}/movements`, reinicia la API y vuelve a consultarlo. Reenviar exactamente la misma recepción con la misma clave devuelve el registro existente; reutilizar la clave para datos diferentes da `409`.

## Reglas aplicadas

- Cantidades de recepción y entrada deben ser positivas; no se consume más de la existencia ni se mezclan unidades.
- La clave `idempotency_key` evita que reenviar una transformación vuelva a descontar inventario. La clave de salida también es única.
- La operación de transformación, el descuento, el movimiento de inventario, el costo y la auditoría se guardan en una misma transacción.
- Merma = `(entrada - salida) / entrada * 100`; alerta si supera 15%, como indica el caso. Salida mayor que entrada exige justificar la adición en incidencias.
- Costo unitario = costo total informado / salida vendible. Margen = `(precio - costo unitario) / precio * 100`; se omite si salida o precio son cero. El costo es una cifra agregada informada; aún no se desglosa por categorías.
- Solo administradores cambian estados de producto. La ficha pública usa una lista explícita de campos autorizados y muestra el motivo solo si está bloqueado.
- La auditoría conserva actor, fecha, acción y valores antes/después; no existe ruta para borrar eventos.

## Persistencia y respaldo

En local, detén la API y copia `cacao.db` para respaldo; restaura la copia en la misma ruta antes del siguiente inicio. En Docker: `docker compose exec -T db pg_dump -U cacao cacao > respaldo.sql`; para restaurar usa `docker compose exec -T db psql -U cacao cacao < respaldo.sql`. No guardes respaldos reales en el repositorio.

## Configuración y alcance actual

Las variables se leen desde `.env` o entorno (`DATABASE_URL`, `SECRET_KEY`, `ACCESS_TOKEN_MINUTES`, `SEED_DEMO_DATA`, `CORS_ORIGINS`). Cambia `SECRET_KEY`, contraseñas y credenciales de PostgreSQL para despliegues; desactiva el sembrado en instalaciones reales. El primer flujo vertical está modelado; las relaciones de transformación multientrada/multisalida, restricciones de retirada, ventas y publicación administrada del perfil público son siguientes etapas, no deben darse por terminadas todavía. Los registros y productores de demostración son sintéticos.
