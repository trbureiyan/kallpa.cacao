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

El Compose también define un servicio frontend, pero la fuente frontend de esta rama está incompleta; por eso no se documenta aquí como un inicio de pila completa verificado. Consulte [backend/README.md](backend/README.md) para ejecución local y pruebas, y [ENTREGA.md](ENTREGA.md) para el estado de los requisitos, la evidencia y las limitaciones.

## Ejecutar las pruebas del backend

Desde `backend/`, con las dependencias de desarrollo instaladas:

```powershell
python -m pytest -q
```

La prueba de concurrencia PostgreSQL se ejecuta aparte y requiere una base de ensayo aislada. No use la base persistente de demostración para ensayos destructivos.
