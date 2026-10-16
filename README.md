# kallpa.cacao

MVP web/PWA para registrar recepciones de cacao, transformaciones, inventario, trazabilidad, costos y fichas públicas de una asociación ficticia del Huila. Todos los datos de demostración son sintéticos.

## Fuentes activas

- API: `backend/app/` (FastAPI, SQLAlchemy, Alembic).
- PWA: `src/frontend/` (React, TypeScript, Vite y service worker).
- Despliegue Compose: PostgreSQL, API y frontend Nginx en servicios separados. `src/backend/` contiene scaffolding vacío y `frontend/` es una copia heredada; no desarrollar en esos dos árboles.

## Ejecutar la aplicación completa

Requiere Docker Desktop con el motor Linux iniciado. Desde PowerShell:

```powershell
cd backend
docker compose up --build
```

- Aplicación web (build de producción): <http://localhost:8080>
- API: <http://localhost:8000>
- Swagger: <http://localhost:8000/docs>
- Salud: <http://localhost:8000/health>
- PostgreSQL: `localhost:5433` (base `cacao`, solo para herramientas locales)

Compose conserva PostgreSQL en el volumen `postgres_data`. `docker compose down` elimina contenedores y red, pero conserva ese volumen. **No ejecutes `docker compose down -v`** si necesitas conservar los datos.

Las cuentas de demostración son `operador` / `Operador123!` y `admin` / `Admin123!`. Son credenciales locales sintéticas; no expongas este Compose a Internet ni reutilices esas claves.

## Desarrollo de la PWA

Desde otra terminal, en `src/frontend/`:

```powershell
npm ci
npm run dev -- --host 0.0.0.0
```

Vite usa normalmente el puerto 5173. La URL `localhost` y la URL de red (IP del computador) son orígenes distintos y pueden mantener cachés de service worker diferentes. Si una muestra una versión anterior, revisa el service worker de ese origen en DevTools; conserva IndexedDB si hay recepciones pendientes.

Para compilar el build de producción:

```powershell
npm run build
```

## Pruebas

Desde `backend/`:

```powershell
python -m pytest -q
```

Las pruebas ordinarias usan una base SQLite temporal. La prueba de concurrencia PostgreSQL requiere `TEST_POSTGRES_URL` apuntando a una base de ensayo aislada cuyo nombre incluya `test`; no la apuntes a la base de demostración.

## Comandos con Make

Desde la raíz del repositorio, con GNU Make instalado:

```sh
make setup           # instala dependencias Python y Node
make run             # inicia PostgreSQL, API y PWA con Docker Compose
make test            # ejecuta las pruebas del backend
make frontend-dev    # inicia Vite para desarrollo
make frontend-build  # compila y verifica TypeScript/PWA
```

`make seed`, `make backup`, `make restore` y `make perf` fallan explícitamente: no hay un sembrado, respaldo con checksum ni prueba de rendimiento independientes implementados. La restauración puede reemplazar datos; siga el procedimiento manual de `backend/README.md` solo en una base aislada.

## Alcance y estado de verificación

La captura offline se limita a recepciones. Transformaciones y cambios de estado requieren conexión. No hay ciclo de ventas implementado. El build y pruebas automatizadas no sustituyen los recorridos manuales RF01–RF12, la validación móvil ni la prueba de restauración; esos resultados se registran en [E05](documentos/E05_pruebas.md) y [ENTREGA](ENTREGA.md).

Los comandos Make son atajos para los flujos de desarrollo documentados arriba. Si GNU Make no está instalado, ejecuta los comandos directos de las secciones anteriores.
