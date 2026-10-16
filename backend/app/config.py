from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET_KEY = "change-this-key-before-deployment"


class Settings(BaseSettings):
    app_name: str = "Cacao con historia"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./cacao.db"
    environment: str = "development"  # development | test | production
    secret_key: str = DEFAULT_SECRET_KEY
    access_token_minutes: int = 60
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    seed_demo_data: bool = True
    # Umbrales de alerta: configuracion, no literales en la logica (el jurado cambia los valores).
    loss_alert_threshold_percent: float = 15.0
    unit_cost_alert_cop: float = 25000.0

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def reject_default_secret_in_production(self):
        # [DECISION] La clave por defecto solo vale en desarrollo y pruebas: con ella cualquiera firma tokens validos.
        # seed_demo_data sigue en True a proposito: el demo del reto depende de CAC001-003 y los usuarios semilla.
        if self.environment == "production" and self.secret_key == DEFAULT_SECRET_KEY:
            raise ValueError("SECRET_KEY debe definirse con un valor propio cuando ENVIRONMENT=production")
        return self


settings = Settings()
