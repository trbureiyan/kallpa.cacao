# Ejecutar desde la raiz del repositorio con GNU Make, Docker y/o Python/npm.
PYTHON ?= python
NPM ?= npm
COMPOSE = docker compose -f backend/docker-compose.yml

.PHONY: setup run test frontend-dev frontend-build seed backup restore perf

setup:
	$(PYTHON) -m pip install -r backend/requirements-dev.txt
	$(NPM) ci --prefix src/frontend

run:
	$(COMPOSE) up --build

test:
	cd backend && $(PYTHON) -m pytest -q

frontend-dev:
	$(NPM) --prefix src/frontend run dev -- --host 0.0.0.0

frontend-build:
	$(NPM) --prefix src/frontend run build

# El sembrado actual ocurre al iniciar la API si SEED_DEMO_DATA=true.
# Este objetivo no inicia servicios ni modifica datos sin una accion explicita.
seed:
	@echo "No hay un comando de sembrado independiente. SEED_DEMO_DATA controla la carga al iniciar la API."
	@echo "Revise backend/README.md antes de iniciar la API contra una base con datos."
	@exit 2

backup:
	@echo "Backup automatizado pendiente: aun no hay script aprobado para crear archivo y checksum."
	@echo "El procedimiento PostgreSQL documentado esta en backend/README.md."
	@exit 2

restore:
	@echo "Restore automatizado deshabilitado: reemplaza datos y requiere una confirmacion manual."
	@echo "Siga el procedimiento de backend/README.md solo en una base aislada y con respaldo verificado."
	@exit 2

perf:
	@echo "No hay una prueba de rendimiento implementada para ejecutar todavia."
	@exit 2
