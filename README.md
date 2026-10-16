# kallpa.cacao

MVP de trazabilidad, transformación y comercialización de cacao para una asociación cacaotera ficticia del Huila. Se desarrolló para la II Hackathon de Programación USCO, reto «Cacao con historia, calidad y valor».

Todos los datos son sintéticos. La asociación, los productores, las fincas y los lotes son parte del caso y no representan a personas ni empresas reales.

## Índice

- [Qué hace](#qué-hace) · [Stack](#stack) · [Requisitos](#requisitos)
- [Estructura del repositorio](#estructura-del-repositorio) · [Instalación y ejecución](#instalación-y-ejecución) · [Configuración](#configuración)
- [Datos de demostración](#datos-de-demostración) · [Arquitectura](#arquitectura) · [Referencia de la API](#referencia-de-la-api)
- [Pruebas](#pruebas) · [Respaldo y restauración](#respaldo-y-restauración) · [Modo sin conexión](#modo-sin-conexión)
- [Solución de problemas](#solución-de-problemas) · [Pendientes](#pendientes) · [Documentación](#documentación)

## Qué hace

- Registra la recepción de lotes de cacao con código legible (`CAC001`, `CAC002`…), productor, finca, cantidad y costo de compra.
- Controla el inventario con un libro de movimientos (`inventory_movements`). El saldo disponible se guarda en cada lote y se actualiza en la misma transacción que su movimiento. Una transformación no puede consumir más existencia de la disponible, y reenviar la misma operación no la descuenta dos veces.
- Registra transformaciones por etapa. Cada salida queda ligada a su lote de origen, y la merma se calcula y se alerta cuando supera el umbral configurable (15 % por defecto).
- Calcula costo unitario y margen, mostrando la fórmula, las unidades y los supuestos.
- Permite al administrador liberar o bloquear un lote con motivo obligatorio. Cada cambio queda en la auditoría.
- Publica una ficha pública por lote con una lista explícita de campos. No muestra costos, márgenes ni datos privados del productor.
- Exporta un resumen en CSV (solo administrador).
- Captura recepciones sin conexión en el navegador (PWA) y las envía al recuperar la red.

Roles:

| Rol | Puede |
|---|---|
| `operador` | Registrar recepciones y transformaciones |
| `administrador` | Ver inventario, costos, alertas, auditoría y exportación; cambiar estados |
| `comprador` | Consultar la ficha pública de un lote, sin cuenta |

## Stack

- **Backend:** Python con FastAPI, SQLAlchemy 2 y Alembic. SQLite por defecto; PostgreSQL 16 con Docker Compose.
- **Frontend:** React 19, TypeScript y Vite. Dexie (IndexedDB) guarda la cola de recepciones sin conexión.
- **Pruebas:** pytest para el backend y vitest para el frontend.

## Requisitos

| Herramienta | Versión | Notas |
|---|---|---|
| Python | 3.12 (CI y Docker) | El backend declara 3.11 o superior; el desarrollo local usó 3.13 |
| Node.js | 24.20.0 (CI); `node:24` en la imagen Docker | |
| pnpm | 11.20.0 | `npm install -g pnpm@11.20.0`. El frontend usa `pnpm-lock.yaml`, no `package-lock.json` |
| Docker y Docker Compose | 29.x (opcional) | Solo para PostgreSQL y para ejecutar la API en contenedor |

Desarrollado en Windows 11. El CI corre en Ubuntu.

## Estructura del repositorio

```text
backend/                 API FastAPI activa
  app/api/               routers por recurso (auth, receptions, transformations, lots, inventory,
                         economics, public, exports, alerts, users, analytics, audit)
  app/models/            modelos SQLAlchemy
  app/services/          reglas de negocio y transacciones
  app/security/          JWT, hash de contraseñas y permisos por rol
  migrations/            Alembic, 5 revisiones
  tests/                 pruebas pytest
  Dockerfile · docker-compose.yml · requirements.txt · requirements-dev.txt · alembic.ini · .env.example
src/frontend/            PWA React + TypeScript (Vite)
  src/api/               cliente HTTP y mapeos de respuesta
  src/context/           sesión, estado de red, fuente de datos y rutas por rol
  src/db/                Dexie (IndexedDB): cola de recepciones sin conexión
  src/features/          un directorio por módulo
  src/pages/             una vista por ruta
  src/test/              configuración de pruebas y prueba de contrato con la API real
scripts/                 respaldo.py (respaldo y restauración de SQLite) y perf_trazabilidad.py
tests/                   pruebas de respaldo y rendimiento; guía en tests/README.md
datos/                   runtime/ (base activa, no se versiona), respaldo/, semilla/, sinteticos/
documentos/              entregables E01–E09 (vacíos por ahora; no existe E04)
pitch/                   presentación (vacía)
.github/workflows/       CI: frontend siempre; backend si existe backend/requirements-dev.txt
src/backend/             scaffold vacío; la API no lo usa
Makefile                 targets vacíos
.env.example             plantilla del scaffold; la API lee backend/.env
```

## Instalación y ejecución

### Backend sin Docker

Desde la raíz del repositorio, en PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

En Linux o macOS: `python3 -m venv .venv`, `source .venv/bin/activate` y `cp .env.example .env`.

Ejecute la API desde `backend/`: el `.env` se lee desde la carpeta de ejecución. Antes de iniciarla, cambie `SECRET_KEY` por un valor propio:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Con `SEED_DEMO_DATA=true`, la API crea los usuarios de demostración, los productores, las fincas y los lotes CAC001–CAC003 al iniciar, solo en las tablas que estén vacías.

| Recurso | Dirección |
|---|---|
| API base | `http://localhost:8000/api/v1` |
| Documentación interactiva (Swagger) | `http://localhost:8000/docs` |
| Estado del servicio | `http://localhost:8000/health` |

La API no sirve la interfaz. La PWA se ejecuta aparte, como se describe a continuación.

Comprobación rápida con la API en marcha. En PowerShell use `curl.exe`; `curl` es un alias de PowerShell con otra sintaxis:

```powershell
curl.exe http://localhost:8000/health
curl.exe -X POST http://localhost:8000/api/v1/auth/login -d "username=operador&password=Operador123!"
```

La primera respuesta es `{"status":"ok","service":"Cacao con historia"}`. La segunda contiene `access_token`.

### Frontend

En otra terminal, desde la raíz del repositorio:

```powershell
cd src/frontend
pnpm install --frozen-lockfile
pnpm build
pnpm exec vite preview --port 5173 --strictPort
```

Abra `http://localhost:5173` con la API en marcha. Para desarrollo con recarga en caliente use `pnpm dev`, que también usa el puerto 5173.

Por defecto, el frontend llama a `http://localhost:8000/api/v1`. Para otra dirección, copie `.env.example` a `.env.local` y cambie `VITE_API_URL`.

### Docker Compose

```powershell
cd backend
docker compose up --build db api
```

Esto levanta PostgreSQL 16 en `127.0.0.1:5433` y la API en `localhost:8000`. El contenedor aplica las migraciones antes de iniciar la API. Los datos de PostgreSQL quedan en el volumen `postgres_data`.

Las credenciales de `backend/docker-compose.yml` son solo para la máquina local. Cámbielas antes de exponer el servicio.

Para levantar también la interfaz en `http://localhost:8080`, ejecute `docker compose up --build` sin nombrar servicios. La imagen del frontend todavía no está verificada (ver [Pendientes](#pendientes)).

## Configuración

### API (`backend/.env`, plantilla en `backend/.env.example`)

| Variable | Valor de ejemplo | Descripción |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./cacao.db` | Base de datos. Para PostgreSQL: `postgresql+psycopg://usuario:clave@host:5432/base` |
| `SECRET_KEY` | (generar una propia) | Firma de los tokens de sesión. Debe cambiarse |
| `ACCESS_TOKEN_MINUTES` | `60` | Duración de la sesión |
| `SEED_DEMO_DATA` | `true` | Carga datos sintéticos al iniciar. Use `false` en instalaciones reales |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Orígenes permitidos, separados por coma |
| `LOSS_ALERT_THRESHOLD_PERCENT` | `15` | Umbral de alerta de merma, en % |
| `DELAY_ALERT_DAYS` | `7` | Días para la alerta de retraso |
| `COST_ALERT_THRESHOLD_COP_PER_KG` | (vacío) | Si se define, activa la alerta de costo por kg, en COP/kg |

Si no existe `.env`, la API usa los valores por defecto del código, que son de desarrollo: `SECRET_KEY` con un texto de ejemplo y `SEED_DEMO_DATA=true`. No use esos valores fuera de la máquina local.

### Frontend (`src/frontend/.env.local`, plantilla en `src/frontend/.env.example`)

| Variable | Valor | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Dirección de la API, sin barra final |
| `VITE_PERMITIR_MODO_LOCAL` | `false` | Con `true`, la PWA trabaja con datos de demostración en el navegador cuando no hay servidor. Debe quedar en `false` en la evaluación |

## Datos de demostración

Creados por `SEED_DEMO_DATA=true`. Son credenciales locales y de prueba:

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `Admin123!` | administrador |
| `operador` | `Operador123!` | operador |

Lotes sembrados:

| Código | Municipio | Cantidad |
|---|---|---|
| CAC001 | Rivera | 100 kg |
| CAC002 | Campoalegre | 150 kg |
| CAC003 | Algeciras | 80 kg |

Antes de exponer el servicio, cambie estas contraseñas o use `SEED_DEMO_DATA=false` y cree las cuentas reales desde el administrador.

Para ver la ficha pública sin iniciar sesión, abra `http://localhost:5173/ficha-publica?lote=CAC001`, o consulte `GET /api/v1/public/products/CAC001`.

Recorrido sugerido en Swagger (`/docs`):

1. Inicie sesión con `POST /api/v1/auth/login` como `operador` y pulse **Authorize**.
2. Cree una finca con `POST /api/v1/farms` y una recepción con `POST /api/v1/receptions`. La respuesta trae el código `CACxxx` asignado.
3. Registre una transformación con `POST /api/v1/transformations`, por ejemplo 100 kg → 80 kg. La merma queda en 20 %.
4. Inicie sesión como `admin` y consulte `GET /api/v1/alerts`, `GET /api/v1/economics` y `GET /api/v1/audit`.

## Arquitectura

### Capas del backend

```text
petición HTTP
  → router (backend/app/api/*.py)                          ruta y validación de entrada (schemas Pydantic)
    → dependencia de permisos (backend/app/security/permissions.py)
                                                           admin_only, operator_or_admin o current_user
      → servicio (backend/app/services/*.py)               reglas de negocio; una transacción por operación
        → modelos SQLAlchemy (backend/app/models/*.py)
          → base de datos (SQLite o PostgreSQL)
```

- `backend/app/main.py` crea la aplicación, configura CORS, monta los routers bajo `/api/v1` y, con `SEED_DEMO_DATA=true`, carga datos de demostración al arrancar.
- Los errores de negocio son `HTTPException` con mensaje en español. La respuesta lleva el campo `detail`; no se devuelven trazas.
- Cada router declara su permiso con `Depends`. Un endpoint nuevo sin esa dependencia queda accesible sin sesión. Revise cada router nuevo.
- La auditoría es de solo inserción: la migración `e4219b1a7c30` crea triggers que bloquean `UPDATE` y `DELETE` sobre `audit_events`.
- Las migraciones de Alembic están en `backend/migrations/versions/`: esquema inicial, municipio de usuario, lotes de salida, huella de idempotencia, y costos y auditoría inmutable.

### Permisos

| Rol en la API | Rol en la interfaz | Acceso |
|---|---|---|
| `operator` | OPERADOR | Crea productores, fincas, recepciones y transformaciones. Consulta lotes, trazabilidad e inventario sin costos. En su propia recepción ve el costo de compra que registró |
| `admin` | ADMINISTRADOR | Todo lo anterior, más costos, economía, alertas, auditoría, CSV, usuarios, panel y cambio de estado |
| sin cuenta | comprador | Solo las rutas `/api/v1/public/...` |

### Modelo de datos

| Tabla | Contenido |
|---|---|
| `users` | Usuarios, rol (`operator` o `admin`), estado activo y municipio |
| `producers`, `farms` | Productores (`code`, `name`, `contact`) y fincas (`producer_id`, `region`) |
| `receptions` | Recepción con `idempotency_key` único, cantidad en kg y costo de compra |
| `lots` | Lote con código `CACxxx`, origen, cantidades recibida, consumida y disponible, `status` (`pending`, `released`, `blocked`), motivo de estado y tipo de producto |
| `transformations` | Etapa sobre un lote: `idempotency_key` único, entrada, salida, incidencia y `request_hash` |
| `transformation_outputs` | Relación entre una transformación y cada lote de salida |
| `inventory_movements` | Libro de movimientos: recepción, consumo y producción, con actor y referencia |
| `cost_entries` | Fuente única de costos, por lote, recepción o transformación |
| `audit_events` | Auditoría: actor, entidad, acción, valor anterior y valor nuevo |

### Frontend

- `src/frontend/src/context/fuente.ts` decide la fuente de datos al iniciar sesión. La sesión usa la API. El modo local (Dexie) solo se activa si no hay red y `VITE_PERMITIR_MODO_LOCAL=true`. Una sesión nunca mezcla las dos fuentes.
- `src/frontend/src/api/axiosClient.ts` usa `VITE_API_URL` y envía el token como `Authorization: Bearer`. Un 401 con sesión activa borra el token y cierra la sesión.
- Rutas públicas: `/login` y `/ficha-publica?lote=CODE`. Rutas para ambos roles: `/dashboard`, `/recepcion`, `/transformacion` y `/trazabilidad`. Solo administrador: `/inventario` y `/auditoria` (`src/frontend/src/context/rutas.ts`). Ocultar una ruta no es seguridad: la API aplica sus propios permisos.
- Las recepciones capturadas sin red se guardan en Dexie (`src/frontend/src/db/dexieDb.ts`). Al reconectar se envían en orden a `POST /api/v1/receptions` con su `idempotency_key`.
- La PWA usa `vite-plugin-pwa`. El `nginx.conf` del contenedor no cachea `sw.js` ni el manifiesto, para que una versión nueva llegue sin demora.

## Referencia de la API

Base: `/api/v1`. Autenticación: `POST /auth/login` con formulario `username` y `password` devuelve `access_token`; envíelo en `Authorization: Bearer <token>`. La documentación interactiva, con los esquemas completos, está en `http://localhost:8000/docs`.

| Método y ruta | Acceso | Uso |
|---|---|---|
| `GET /health` | público | Estado del servicio |
| `POST /auth/login` | público | Inicio de sesión; devuelve `access_token` |
| `GET /auth/me` | autenticado | Usuario y rol del token |
| `GET /farms` · `POST /farms` | operador o administrador | Catálogo de fincas; alta con `producer_id`, `name`, `region` |
| `POST /producers` | operador o administrador | Alta con `code` y `name` |
| `POST /receptions` | operador o administrador | Recepción, lote, movimiento y costo en una transacción; exige `idempotency_key` |
| `GET /lots` | autenticado | Lista con filtros `origin` y `status` |
| `GET /lots/{lot_id}` | autenticado | Lote y saldo |
| `GET /lots/{lot_id}/movements` | autenticado | Libro de movimientos del lote |
| `GET /lots/{lot_id}/traceability` | autenticado | Recorrido hacia el origen y hacia los lotes descendientes |
| `GET /lots/{lot_id}/audit` | administrador | Historial de cambios del lote |
| `PATCH /lots/{lot_id}/status` | administrador | `status` (`pending`, `released`, `blocked`) y `reason` de 3 a 500 caracteres |
| `PATCH /lots/products/{output_code}/status` | administrador | Igual que el anterior, para un producto de salida |
| `POST /transformations` | operador o administrador | Etapa sobre un lote; exige `idempotency_key` |
| `GET /transformations` | autenticado | Historial de transformaciones |
| `GET /inventory` | autenticado | Saldo disponible por lote, sin costos |
| `GET /inventory/movements` | autenticado | Movimientos de inventario |
| `GET /inventory/admin` | administrador | Inventario con costos por lote; filtros `origin` y `status` |
| `GET /economics` · `GET /economics/{transformation_id}` | administrador | Costo unitario y margen, con fórmula y supuestos |
| `GET /alerts` | administrador | Alertas de `merma`, `registro_incompleto`, `retraso` y `costo` |
| `GET /audit` | administrador | Auditoría global |
| `GET /exports/lots.csv` | administrador | CSV de lotes; filtros `origin` y `status` |
| `GET /users` · `POST /users` · `PATCH /users/{user_id}` | administrador | Gestión de cuentas |
| `GET /analytics/dashboard` | administrador | Indicadores del panel |
| `GET /public/products/{code}` | público | Ficha con campos permitidos; sin costos ni datos de contacto |
| `GET /public/products/{code}/traceability` | público | Línea de tiempo permitida; sin costos |

Las operaciones que no pueden completarse responden con 409 y un mensaje explicativo. Las reglas de cada una están en [Solución de problemas](#solución-de-problemas).

## Pruebas

### Backend

```powershell
cd backend
pip install -r requirements-dev.txt
python -m pytest -q
```

Las pruebas usan una base SQLite temporal y no modifican `cacao.db`. La prueba de concurrencia en PostgreSQL se omite si no se define `TEST_POSTGRES_URL`. Esa variable debe apuntar a una base aislada cuyo nombre incluya `test`.

### Respaldo y rendimiento

Desde la raíz del repositorio, con el Python que tiene instaladas las dependencias del backend:

```powershell
python -m pytest tests -q
python scripts/perf_trazabilidad.py
```

`perf_trazabilidad.py` crea una base temporal con 100 lotes y 130 transformaciones. Mide la consulta de trazabilidad de los 100 lotes, cinco veces cada uno, y reporta la primera consulta, la mediana, el p95 y el máximo, junto con el equipo. Mide el servidor y la base de datos, no la red ni el dibujo de la pantalla. El objetivo es de 3 s o menos.

### Frontend

```powershell
cd src/frontend
pnpm exec tsc -b
pnpm exec eslint .
pnpm test
pnpm build
```

### Contrato frontend–API con la API real

Requiere la API en `http://localhost:8000` y una base de pruebas. La prueba crea lotes nuevos en esa base.

```powershell
cd src/frontend
$env:E2E_API = "1"
pnpm exec vitest run src/test/contrato.e2e.test.ts
```

Los usuarios se cambian con `E2E_ADMIN`, `E2E_ADMIN_CLAVE`, `E2E_OPERADOR` y `E2E_OPERADOR_CLAVE`.

El workflow `.github/workflows/ci.yml` ejecuta en cada envío los tipos, el lint, las pruebas y el build del frontend, y las pruebas del backend.

Los targets de `Makefile` están vacíos todavía. `make test` termina sin error y sin ejecutar pruebas; no lo use como señal de calidad. Use los comandos de esta sección.

### Último resultado registrado

Ejecución del 2026-10-16 en Windows 11, con las dependencias instaladas desde los archivos del repositorio:

| Comando | Resultado |
|---|---|
| `python -m pytest -q` en `backend/` | 24 pasaron y 1 se omitió (PostgreSQL, sin `TEST_POSTGRES_URL`) |
| `python -m pytest tests -q` en la raíz | 12 pasaron |
| `pnpm test` en `src/frontend/` | 36 archivos y 269 pruebas pasaron; 14 se omitieron, entre ellas la de contrato con la API real |
| `pnpm exec tsc -b` y `pnpm exec eslint .` | Sin errores |
| `pnpm build` | Correcto |

También se comprobaron, sobre una base temporal fuera de `datos/runtime/`: las migraciones, `/health`, el inicio de sesión, el 401 sin token, la ficha pública y los ejemplos de recepción y transformación 100 kg → 80 kg. La prueba de contrato con la API real (`E2E_API=1`) no se ejecutó en esa verificación.

Este registro no sustituye a los resultados oficiales de E05, que aún están vacíos. Las cifras de la entrega deben salir de la ejecución del equipo, con su fecha y su equipo.

## Respaldo y restauración

Las instrucciones son para SQLite. Para PostgreSQL, use los comandos de la última sección.

El script `scripts/respaldo.py` usa por defecto `datos/runtime/cacao.db`. La API, en cambio, usa `backend/cacao.db` si no se define `DATABASE_URL`. Para respaldar la base que usa la API, indique la ruta con `--db`:

```powershell
python scripts/respaldo.py backup --db backend/cacao.db
python scripts/respaldo.py verify datos/respaldo/cacao_<fecha>.json --db backend/cacao.db
```

- `backup` copia la base con la API de respaldo de SQLite, válida aunque la API esté escribiendo. Crea `cacao_<fecha>.db` y un `.json` con el SHA-256 y, por tabla, la cantidad de filas y un hash de identificadores y contenido. Si nada cambió desde el último respaldo, no crea otro.
- `verify` compara la base activa con el `.json` y responde si coincide o qué tablas difieren. Es la comprobación de integridad por cantidades e identificadores.
- `restore` reemplaza la base activa. Detenga la API antes:

```powershell
python scripts/respaldo.py restore datos/respaldo/cacao_<fecha>.db --db backend/cacao.db --confirmar
```

`restore` verifica el checksum, guarda el estado previo en `datos/respaldo/pre_restauracion_*.db` y reemplaza la base de forma atómica. Lo que se registró después del respaldo sale de la base activa, pero queda en ese archivo previo.

No copie el archivo `.db` a mano mientras la API está en marcha. Use el script.

Respaldos de PostgreSQL con Docker Compose:

```powershell
docker compose exec -T db pg_dump -U cacao cacao > respaldo.sql
docker compose exec -T db psql -U cacao cacao < respaldo.sql
```

Restaure en una base vacía. No use `docker compose down -v` para reiniciar: borra el volumen con los datos.

No guarde respaldos reales en el repositorio. Los respaldos de demostración deben ser sintéticos.

## Modo sin conexión

- Las recepciones se capturan en el navegador cuando no hay red. Cada una lleva un identificador técnico generado en el cliente. Al reconectar, el servidor asigna el código `CACxxx`.
- El reenvío de una recepción con la misma clave devuelve el registro original. Las pruebas automáticas cubren este reintento en el backend. La recuperación de la red en el navegador se verifica a mano.
- Las transformaciones y los cambios de estado requieren conexión.
- Con `VITE_PERMITIR_MODO_LOCAL=true`, la PWA muestra datos de demostración si el servidor no responde. En la evaluación debe estar en `false`.

## Servicios externos y costos

- **Servicios externos en ejecución:** ninguno. Una búsqueda de URLs en el código de la aplicación no encontró llamadas a servicios de terceros. Las fuentes tipográficas se empaquetan con el frontend.
- **Costos:** no hay licencias de pago. Un equipo con Python, Node.js y pnpm puede ejecutar el sistema sin costo. Docker es opcional. Un despliegue productivo no está dimensionado todavía.

## Solución de problemas

**`unable to open database file` al arrancar la API o al ejecutar Alembic.** La URL de SQLite apunta a una ruta que Windows no puede abrir. Es típico de rutas estilo Git Bash (`sqlite:////c/...`). Use la ruta relativa de esta guía (`sqlite:///./cacao.db`, desde `backend/`) o una ruta de Windows (`sqlite:///C:/ruta/completa/cacao.db`).

**`alembic` no se reconoce como comando.** Active el entorno virtual (`.venv\Scripts\Activate.ps1`) o use `python -m alembic upgrade head`.

**PowerShell no ejecuta `Activate.ps1`.** Permita scripts locales para su usuario con `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**El navegador bloquea las peticiones con un error de CORS.** Agregue el origen de la PWA (por ejemplo `http://localhost:5173`) a `CORS_ORIGINS` en `backend/.env` y reinicie la API.

**401 en todas las rutas después de un rato.** La sesión vence a los `ACCESS_TOKEN_MINUTES` (60 por defecto). Inicie sesión de nuevo. Cambiar `SECRET_KEY` también invalida los tokens emitidos.

**403 "No tienes permiso para esta acción".** El rol no alcanza esa ruta. Por ejemplo, el operador no ve costos, auditoría ni el CSV. Use una cuenta de administrador.

**409 "Existencia insuficiente: disponible X kg".** La transformación pide más kilos de los que tiene el lote. Reduzca la cantidad o revise el saldo en `GET /api/v1/lots/{lot_id}`.

**409 "No se puede transformar un lote bloqueado".** Un administrador debe liberar el lote con `PATCH /api/v1/lots/{lot_id}/status` y un motivo.

**409 "La clave de idempotencia ya fue usada con otra …".** Esa clave pertenece a otra operación con datos distintos. Para una operación nueva, genere una clave nueva (UUID). Para reenviar la misma operación, use los mismos datos y la misma clave.

**Un cambio de `VITE_API_URL` no tiene efecto.** Las variables de Vite se incrustan al compilar. Reinicie `pnpm dev` o vuelva a ejecutar `pnpm build`.

**`pnpm install --frozen-lockfile` falla.** Revise que tenga pnpm 11.20.0 (`pnpm -v`). Si cambió `package.json`, actualice `pnpm-lock.yaml` en el mismo cambio. No use `npm install` en `src/frontend/`: el lockfile es de pnpm.

**Las pruebas del frontend muestran "HTMLCanvasElement's getContext() method ... not implemented".** Es ruido de jsdom y no indica un fallo.

**`scripts/respaldo.py restore` dice que la base está en uso.** Detenga la API y repita el comando.

**La base no tiene datos de demostración.** La API los carga solo al arrancar, con `SEED_DEMO_DATA=true` y solo en las tablas vacías. Para volver a sembrar no borre `datos/runtime/` sin antes hacer un respaldo.

**El puerto 8000 o 5173 está ocupado.** Use otro puerto (`uvicorn app.main:app --port 8001`, `pnpm exec vite --port 5174`). Si cambia el de la API, actualice `VITE_API_URL` y `CORS_ORIGINS`.

## Pendientes

Estos puntos están verificados en el código y se conocen; no son fallas nuevas:

- El CSV del servidor no neutraliza texto que Excel interpreta como fórmula (`=`, `+`, `-`, `@`). El CSV del modo local sí lo hace.
- Un costo de etapa sin dato llega al servidor como 0 y puede leerse como costo calculable.
- `SECRET_KEY` y `SEED_DEMO_DATA` tienen valores de desarrollo por defecto.
- `backend/requirements.txt` usa rangos de versión y no hay lockfile del backend.
- La imagen Docker del frontend (`src/frontend/Dockerfile`) no se ha probado.
- Los targets de `Makefile` están vacíos.
- `backend/cacao.db` no está en `.gitignore`. Solo se ignoran `.env`, `datos/runtime/*` y las carpetas de dependencias. Agregue una regla para `*.db` antes de versionar `backend/`.
- El saldo disponible se guarda en `lots.available_quantity` y no se recalcula desde `inventory_movements` en cada lectura. La regla de diseño pide derivarlo del libro. Hoy la coherencia depende de las transacciones de `backend/app/services/transformation.py`.
- Las credenciales de demostración están en `backend/app/main.py` y en esta guía. Retírelas o desactive el sembrado antes de cualquier despliegue.
- `.env.example` de la raíz no coincide con la configuración que lee la API. Use `backend/.env.example`.
- Faltan los casos manuales de `tests/casos_manuales.md`, la tarjeta de cambio `documentos/cambios/CC-001` y la prueba de regresión de la hora 12 en `tests/backend/regresion/`.
- Las pruebas de la PWA en la evaluación (desconexión, móvil, teclado) se hacen a mano y se registran en `documentos/E05_pruebas.md`.

## Documentación

- `documentos/` contiene los entregables E01–E03 y E05–E09. Todos están vacíos y no existe E04. `ENTREGA.md` y `tests/casos_manuales.md` también están vacíos.
- Las bibliotecas y plantillas de terceros se declararán en `documentos/E08_IA_y_fuentes.md`.
- `ENTREGA.md` indicará el commit final y la matriz de requisitos, componentes, pruebas y resultados.
