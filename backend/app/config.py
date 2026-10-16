from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Cacao con historia"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./cacao.db"
    secret_key: str = "change-this-key-before-deployment"
    access_token_minutes: int = 60
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    seed_demo_data: bool = True
    loss_alert_threshold_percent: float = 15.0
    delay_alert_days: int = Field(default=7, ge=0)
    cost_alert_threshold_cop_per_kg: float | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
