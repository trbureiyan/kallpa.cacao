# Ejecutar desde la raiz del repositorio con GNU Make. Requiere Python y pnpm; `run` requiere ademas Docker.
# PYTHON debe ser el Python que tiene las dependencias del backend. Si no esta en el PATH, pase una ruta ABSOLUTA
# (los objetivos que entran a backend/ no resuelven rutas relativas):
#   Windows:     make test PYTHON=C:/ruta/al/repo/backend/.venv/Scripts/python.exe
#   Linux/macOS: make test PYTHON=/ruta/al/repo/backend/.venv/bin/python
PYTHON ?= python
PNPM ?= pnpm
COMPOSE = docker compose -f backend/docker-compose.yml

.PHONY: setup run run-local test test-root test-frontend test-contrato test-all frontend-dev frontend-build seed backup verify restore perf

setup:
	$(PYTHON) -m pip install -r backend/requirements-dev.txt
	$(PNPM) --dir src/frontend install --frozen-lockfile

run:
	$(COMPOSE) up --build

# Un solo proceso y sin Docker: compila la PWA y la API la sirve en http://localhost:8000/ (backend/README.md).
# Usa DATABASE_URL del entorno o de backend/.env; sin ninguna crea backend/cacao.db.
run-local: frontend-build
	cd backend && $(PYTHON) -m alembic upgrade head && $(PYTHON) -m uvicorn app.main:app --port 8000

# test: pruebas del backend (sin cambios). test-root: respaldo, rendimiento y regresion de la hora 12.
# test-frontend: tipos, lint y pruebas del frontend. test-all: las tres.
test:
	cd backend && $(PYTHON) -m pytest -q

test-root:
	$(PYTHON) -m pytest tests -q

test-frontend:
	$(PNPM) --dir src/frontend exec tsc -b
	$(PNPM) --dir src/frontend exec eslint .
	$(PNPM) --dir src/frontend run test

# Contrato frontend-API contra una API REAL ya iniciada en http://localhost:8000. CREA lotes en su base: use una base de pruebas.
test-contrato:
	cd src/frontend && E2E_API=1 $(PNPM) exec vitest run src/test/contrato.e2e.test.ts

test-all: test test-root test-frontend

frontend-dev:
	$(PNPM) --dir src/frontend run dev --host 0.0.0.0

frontend-build:
	$(PNPM) --dir src/frontend run build

# El sembrado actual ocurre al iniciar la API si SEED_DEMO_DATA=true.
# Este objetivo no inicia servicios ni modifica datos sin una accion explicita.
seed:
	@echo "No hay un comando de sembrado independiente. SEED_DEMO_DATA controla la carga al iniciar la API."
	@echo "Revise backend/README.md antes de iniciar la API contra una base con datos."
	@exit 2

# Respaldo de la base SQLite que usa la API (scripts/respaldo.py): copia en datos/respaldo/ con checksum SHA-256.
# La base se toma de DATABASE_URL, backend/.env o la unica existente; el script imprime cual uso. PostgreSQL: pg_dump.
backup:
	$(PYTHON) scripts/respaldo.py backup

# make verify HUELLA=datos/respaldo/cacao_<fecha>.json : compara la base activa con la huella de un respaldo.
verify:
	@test -n "$(HUELLA)" || { echo "Uso: make verify HUELLA=datos/respaldo/cacao_<fecha>.json"; exit 2; }
	$(PYTHON) scripts/respaldo.py verify "$(HUELLA)"

# REEMPLAZA la base activa. Exige dos variables explicitas y la API detenida; guarda antes el estado previo en datos/respaldo/.
#   make restore RESPALDO=datos/respaldo/cacao_<fecha>.db CONFIRMAR=1
restore:
	@test -n "$(RESPALDO)" || { echo "Uso: make restore RESPALDO=datos/respaldo/cacao_<fecha>.db CONFIRMAR=1 (detenga la API antes)"; exit 2; }
	@test "$(CONFIRMAR)" = "1" || { echo "Restaurar reemplaza la base activa. Repita con CONFIRMAR=1 y la API detenida."; exit 2; }
	$(PYTHON) scripts/respaldo.py restore "$(RESPALDO)" --confirmar

# Rendimiento de la trazabilidad sobre 100 lotes sinteticos en una base temporal (scripts/perf_trazabilidad.py).
perf:
	$(PYTHON) scripts/perf_trazabilidad.py
