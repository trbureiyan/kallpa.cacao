# E07 - Operación, instalación y recuperación

**Estado: instrucciones de desarrollo; instalación limpia y restauración aún no ensayadas.** No presentar esta guía como evidencia de recuperación probada.

## Requisitos y ejecución

- Docker Desktop con motor Linux; Docker Compose v2.
- La pila usa PostgreSQL 16, FastAPI/Python 3.12 y React/TypeScript/Vite. El servicio web de Compose publica el build de Vite por Nginx.
- Desde la raíz del repositorio, en PowerShell:

```powershell
cd backend
docker compose up --build
```

Direcciones: web `http://localhost:8080`, API `http://localhost:8000`, Swagger `http://localhost:8000/docs`, salud `http://localhost:8000/health`; PostgreSQL se publica solo en loopback en `localhost:5433`.

Compose aplica Alembic al iniciar la API. La instancia observada el 16-10-2026 informó `b6d1ef3a9204 (head)`. Las credenciales `operador` / `Operador123!` y `admin` / `Admin123!` son únicamente sintéticas para desarrollo.

Para detener sin borrar datos: `Ctrl+C` o `docker compose stop`. `docker compose down` elimina contenedores y red pero conserva el volumen `postgres_data`. No usar `docker compose down -v` para la base de demostración.

## Desarrollo y validación

La PWA canónica está en `src/frontend/`; la API ejecutada por Compose está en `backend/`. Para Vite, desde `src/frontend/`: `npm ci` y `npm run dev -- --host 0.0.0.0`. Para compilar: `npm run build`. Para pruebas de backend, desde `backend/`: `python -m pytest -q`.

Resultados observados el 16-10-2026: 18 pruebas aprobadas, 1 omitida (concurrencia PostgreSQL no configurada en la suite ordinaria) y 1 advertencia deprecada de Starlette/TestClient; la prueba de concurrencia se ejecutó aparte en PostgreSQL temporal y pasó (1 aprobada); `npm run build` pasó; `/health`, `/docs` y la raíz web respondieron HTTP 200. No se hizo en esta revisión un recorrido visual completo ni una restauración.

## Respaldo y restauración

Respaldo manual de la base Compose a una ubicación fuera del repositorio (no versionar datos operativos):

```powershell
$fecha = Get-Date -Format 'yyyyMMdd-HHmmss'
docker compose exec -T db pg_dump -U cacao -d cacao --format=custom > "C:\ruta-segura\cacao-$fecha.dump"
```

La restauración **no está automatizada ni probada**. Antes de usarla, el equipo debe crear una instancia de PostgreSQL aislada, restaurar allí el archivo con `pg_restore` y comparar conteos, códigos de lote, saldos, relaciones de transformación y auditoría. No restaurar con `--clean` ni sobrescribir la base de demostración como ensayo.

## Limitaciones conocidas y siguientes acciones

- Offline solo admite recepciones; transformaciones y cambios de estado exigen conexión.
- No se implementa el ciclo de ventas.
- `Makefile` tiene objetivos vacíos; esta entrega usa comandos explícitos.
- Faltan el ensayo de restauración aislada, la medición de trazabilidad con 100 registros y la evidencia de recorrido visual en escritorio/móvil. Registrar resultados reales en E05 y ENTREGA.
