from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Cacao con historia"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./cacao.db"
    secret_key: str = "change-this-key-before-deployment"
    access_token_minutes: int = 60
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    seed_demo_data: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
