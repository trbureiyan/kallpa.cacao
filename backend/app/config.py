from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Cacao con historia"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./cacao.db"
    secret_key: str = "change-this-key-before-deployment"
    access_token_minutes: int = 60
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    seed_demo_data: bool = True
    # Umbrales de alerta: configuracion, no literales en la logica (el jurado cambia los valores).
    loss_alert_threshold_percent: float = 15.0
    unit_cost_alert_cop: float = 25000.0

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
