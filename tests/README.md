# Guía para el equipo de pruebas

Cómo levantar el sistema, qué está cubierto por pruebas automáticas y qué se prueba a mano.
**Este archivo no contiene resultados de pruebas.** Cada resultado lo registra quien ejecuta la prueba en `tests/casos_manuales.md` y en `documentos/E05_pruebas`, tal como salió, incluidas las fallas.

## 1. Requisitos

| Herramienta | Versión usada en el desarrollo |
|---|---|
| Python | 3.12 (CI) y 3.13 local |
| Node | 24.22.1 |
| pnpm | 12.15.0 (el frontend usa `pnpm-lock.yaml`, no `package-lock.json`) |
| Docker (opcional) | 29.x, solo para `docker compose` |

## 2. Levantar el sistema sin Docker

Desde la raíz del repositorio. La base SQLite queda en `datos/runtime/` (ignorada por git); bórrela solo si quiere empezar de cero.

```bash
# API (terminal 1)
cd backend
python -m venv .venv && .venv/Scripts/python -m pip install -r requirements-dev.txt   # en Linux/macOS: .venv/bin/python
# la ruta de la base es relativa a backend/
export DATABASE_URL="sqlite:///../datos/runtime/cacao.db" SECRET_KEY=prueba-local SEED_DEMO_DATA=true \
       CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
.venv/Scripts/python -m alembic upgrade head
.venv/Scripts/python -m uvicorn app.main:app --port 8000

# Frontend (terminal 2)
cd src/frontend
pnpm install --frozen-lockfile
pnpm build && pnpm exec vite preview --port 5173 --strictPort     # PWA en http://localhost:5173
```

Con Docker: `docker compose -f backend/docker-compose.yml up --build` (API en `:8000`, PWA en `:8080`).
El `Dockerfile` de `src/frontend` **no se ha probado**: si la construcción falla, repórtelo como hallazgo.

Usuarios sintéticos del sembrado (`SEED_DEMO_DATA=true`): `admin` / `Admin123!` y `operador` / `Operador123!`.
Lotes sembrados: CAC001 (Rivera, 100 kg), CAC002 (Campoalegre, 150 kg), CAC003 (Algeciras, 80 kg).

El frontend tiene un **modo local** (sin servidor) apagado por defecto. Para probarlo, cree `src/frontend/.env.local` con
`VITE_PERMITIR_MODO_LOCAL=true` y reconstruya; se activa solo si el servidor no responde al iniciar sesión.
En la evaluación debe quedar en `false`.

## 3. Pruebas automáticas

| Qué | Comando | Dónde |
|---|---|---|
| Frontend (tipos, lint, unitarias, build) | `cd src/frontend && pnpm exec tsc -b && pnpm exec eslint . && pnpm test && pnpm build` | `src/frontend/src/**/*.test.ts(x)` |
| Backend | `cd backend && .venv/Scripts/python -m pytest -q` | `backend/tests/` (la de concurrencia en PostgreSQL se omite sin `TEST_POSTGRES_URL`) |
| Respaldo, restauración, rendimiento y regresión de la hora 12 | `backend/.venv/Scripts/python -m pytest tests -q` (desde la raíz) | `tests/backend/integration/`, `tests/backend/rendimiento/`, `tests/backend/regresion/` |
| Contrato frontend–API **real** | con la API en `:8000`: `cd src/frontend && E2E_API=1 pnpm exec vitest run src/test/contrato.e2e.test.ts` | `src/frontend/src/test/contrato.e2e.test.ts` |

La prueba de contrato recorre recepción, transformación 100 → 80 kg, costo y margen, bloqueo, ficha pública, auditoría,
alertas, CSV y permisos del operador. **Crea lotes nuevos en la base de la API: úsela solo con una base de pruebas.**
Los usuarios se pueden cambiar con `E2E_ADMIN`, `E2E_ADMIN_CLAVE`, `E2E_OPERADOR` y `E2E_OPERADOR_CLAVE`.

El CI (`.github/workflows/ci.yml`) corre las tres primeras filas en cada push.

## 4. Respaldo y restauración

Script: `scripts/respaldo.py` (solo biblioteca estándar). Cubre SQLite; para PostgreSQL use `pg_dump`/`pg_restore`.

```bash
python scripts/respaldo.py backup                                   # la base de la API -> datos/respaldo/cacao_<fecha>.db + .json
python scripts/respaldo.py verify datos/respaldo/cacao_<fecha>.json # compara la base activa con el respaldo
python scripts/respaldo.py restore datos/respaldo/cacao_<fecha>.db --confirmar   # DETENGA LA API ANTES
```

- La base se toma de `--db` o se resuelve como la API: variable `DATABASE_URL`, luego `backend/.env`, luego la única de `datos/runtime/cacao.db` y `backend/cacao.db` que exista (si hay dos, pide `--db`). El script imprime siempre `Base: <ruta>`: **compruebe que es la que usa su API**. Si exportó `DATABASE_URL` en otra terminal, expórtela también aquí o use `--db`.
- El `.json` guarda el checksum SHA-256 del archivo y, por tabla, la cantidad de filas y un hash de identificadores y de contenido.
- `backup` es idempotente: si nada cambió desde el último respaldo, no crea otro.
- `restore` exige `--confirmar`, verifica el checksum, guarda el estado previo en `datos/respaldo/pre_restauracion_*.db`, reemplaza la base de forma atómica y verifica el resultado.
- Pruebas automáticas: `tests/backend/integration/test_respaldo.py` (bases temporales). **No ejecute `restore` sobre `datos/runtime/` sin un respaldo verificado.**

La prueba del jurado («reiniciar y recuperar un respaldo sin pérdida ni duplicación») debe hacerse a mano con la API detenida y registrarse en E05.

## 5. Rendimiento

`python scripts/perf_trazabilidad.py` (con el Python del backend). Crea una base temporal con 100 lotes recibidos y 130 transformaciones,
consulta la trazabilidad de los 100 lotes 5 veces cada uno y reporta la primera consulta, mínimo, mediana, p95 y máximo, junto con el equipo.
Mide la lógica del servidor y la base de datos, **no** la red ni el dibujo de la pantalla: el tiempo de la pantalla hay que medirlo
en el navegador (pestaña Rendimiento de las herramientas de desarrollo) y declararlo aparte. El objetivo del reto es hasta 3 s después de cargar la aplicación.
La repetición automática es `tests/backend/rendimiento/test_trazabilidad_100.py`.

## 6. Lo que se prueba a mano

El jurado ejecutará estas pruebas con valores propios. Ejecútelas con **valores distintos a los del ejemplo** para comprobar que se calcula y no se muestran cifras fijas.

| Prueba del jurado | Qué hacer | Cobertura automática |
|---|---|---|
| Crear un lote válido | Recepción como operador; reiniciar API y PWA; el lote sigue | Contrato E2E (crear); la persistencia tras reinicio es manual |
| Cantidad negativa o campo vacío | Probar 0, -5, vacío y texto | Pruebas unitarias del frontend; `backend/tests/test_recepcion_lote.py` |
| Transformación 100 → 80 kg | Merma 20 % y alerta | Contrato E2E; `backend/tests/test_merma_y_perdidas.py` |
| Costo y margen | 1.600.000 COP, 80 kg, precio 25.000: 20.000 COP/kg y 20 % con fórmula y supuestos visibles | Contrato E2E |
| Consultar como comprador | `/ficha-publica?lote=<código>` sin iniciar sesión: sin costos ni datos del productor | Contrato E2E; `backend/tests/test_ficha_publica_auditoria_global.py` |
| Reiniciar y recuperar un respaldo | Sección 4 | Solo el script; el recorrido completo es manual |
| Consumir más que la existencia y reenviar | Pedir más kg de los disponibles; repetir el mismo envío | Contrato E2E; `backend/tests/test_inventario_idempotencia.py` |
| Bloquear CAC001 y consultar su ficha | Administrador bloquea con motivo; ficha muestra bloqueado, origen y recorrido; historial intacto | Contrato E2E |
| Liberar como operador y revisar auditoría | El operador no puede; el administrador sí y queda en Auditoría | Contrato E2E; `backend/tests/test_permisos_roles.py` |

Además, solo se verifica a mano:
- **Sin conexión:** desconectar la red, registrar recepciones, reconectar y comprobar que se sincronizan con código `CACxxx`, sin duplicar.
- **Móvil:** probar en un teléfono o con el modo dispositivo del navegador; objetivos táctiles, foco y contraste.
- **Teclado y lector de pantalla:** recorrer el flujo solo con teclado (el modal de cambio de estado atrapa el foco y se cierra con Esc).
- **Persona ajena al equipo** (E06): dos tareas sin indicarle cada clic.

