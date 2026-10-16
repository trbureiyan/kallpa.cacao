# kallpa.cacao

MVP para registrar recepciones de cacao, conservarlas sin conexion y sincronizarlas con una API de trazabilidad.

## Ejecutar con Docker

Desde `backend/`: `docker compose up --build`. La PWA queda en `http://localhost:8080`, la API en `http://localhost:8000` y su documentacion en `http://localhost:8000/docs`. Los datos de demostracion son sinteticos: `operador` / `Operador123!`.

## Estructura activa

- `backend/`: API FastAPI, PostgreSQL/SQLite y migraciones.
- `src/frontend/`: PWA React, captura offline en IndexedDB y sincronizacion de recepciones.
- `frontend/`: copia anterior conservada; no la usa Docker Compose.

Para desarrollo local del frontend y ensayo offline, consulte [`src/frontend/README.md`](src/frontend/README.md).

## Verificacion automatizada

En PowerShell, desde la raiz del repositorio, ejecute: `.\.venv\Scripts\python.exe -m unittest discover -s tests/backend/integration -p test_offline_receptions.py`.
