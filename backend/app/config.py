from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


SECRETO_DE_EJEMPLO = "change-this-key-before-deployment"
SECRETOS_CONOCIDOS = {SECRETO_DE_EJEMPLO, "replace-with-a-long-random-secret"}
LARGO_MINIMO_SECRETO = 32
ENTORNOS_DE_DESARROLLO = {"development", "dev", "local", "test"}


class Settings(BaseSettings):
    # "production" activa todas las comprobaciones de validar_configuracion(); solo los entornos de desarrollo conocidos las omiten
    app_env: str = "development"
    app_name: str = "Cacao con historia"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./cacao.db"
    secret_key: str = SECRETO_DE_EJEMPLO
    access_token_minutes: int = 60
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    # carpeta del build del frontend; vacío = src/frontend/dist del repositorio
    frontend_dist: str = ""
    seed_demo_data: bool = True
    loss_alert_threshold_percent: float = 15.0
    delay_alert_days: int = Field(default=7, ge=0)
    cost_alert_threshold_cop_per_kg: float | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()


def validar_configuracion(s: Settings) -> list[str]:
    """Problemas que impiden arrancar. Un entorno de desarrollo explícito no valida nada para no estorbar el trabajo local."""
    entorno = s.app_env.strip().lower()
    if entorno in ENTORNOS_DE_DESARROLLO:
        return []
    problemas = []
    if entorno != "production":
        # un error de tipeo ("prod") no debe desactivar las comprobaciones: se falla de forma segura
        return [
            f"APP_ENV='{s.app_env}' no es un entorno conocido. Use 'production' o uno de desarrollo "
            f"({', '.join(sorted(ENTORNOS_DE_DESARROLLO))}); un valor mal escrito no puede dejar la API sin comprobaciones."
        ]
    if s.secret_key in SECRETOS_CONOCIDOS or len(s.secret_key) < LARGO_MINIMO_SECRETO:
        problemas.append(
            f"SECRET_KEY es un valor de ejemplo o tiene menos de {LARGO_MINIMO_SECRETO} caracteres: "
            "defina un secreto largo y aleatorio. Cualquiera podría firmar sesiones válidas con el de ejemplo."
        )
    if s.seed_demo_data:
        problemas.append(
            "SEED_DEMO_DATA está activo: en producción no se siembran usuarios de demostración con contraseñas conocidas. "
            "Defina SEED_DEMO_DATA=false."
        )
    return problemas
