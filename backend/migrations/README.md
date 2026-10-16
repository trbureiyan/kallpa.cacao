# Migraciones

Las tablas se versionan con Alembic. En local, con el entorno virtual activo desde `backend/`, aplica los cambios con `alembic upgrade head`. Docker ejecuta ese comando al iniciar el contenedor de la API. Para crear una migración después de editar modelos, genera una revisión con `alembic revision --autogenerate -m "descripcion"`, revisa el archivo generado y aplícala con `alembic upgrade head`.
