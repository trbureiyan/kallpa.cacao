# kallpa.cacao

Backend para un MVP de trazabilidad de cacao: recepción, lotes, transformación, inventario, alertas, economía y consulta pública. El repositorio está en la rama `backend`.

## Iniciar la API y PostgreSQL con Docker

Desde PowerShell, en `backend/`:

```powershell
docker compose up --build db api
```

- API: <http://localhost:8000>
- Swagger: <http://localhost:8000/docs>
- Salud: <http://localhost:8000/health>

Las credenciales sintéticas de demostración son `operador` / `Operador123!` y `admin` / `Admin123!`. No exponga esas credenciales ni la configuración local a Internet.

La pila incluye el frontend canónico React/PWA en `src/frontend`; el build de producción está verificado. Falta recorrer manualmente las vistas administrativas en escritorio y móvil contra API y PostgreSQL en ejecución. Consulte [backend/README.md](backend/README.md) para rutas de economía, inventario administrativo, auditoría y CSV; [ENTREGA.md](ENTREGA.md) registra estado y evidencia.

## Ejecutar las pruebas del backend

Desde `backend/`, con las dependencias de desarrollo instaladas:

```powershell
python -m pytest -q
```

La prueba de concurrencia PostgreSQL se ejecuta aparte y requiere una base de ensayo aislada. No use la base persistente de demostración para ensayos destructivos.
