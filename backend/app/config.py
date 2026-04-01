"""
============================================================
config.py — App Configuration via Pydantic Settings
============================================================

Reads environment variables from .env file automatically.
All settings are type-validated by Pydantic.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Pydantic automatically reads from a .env file in the working directory.
    """

    # Firebase service account JSON file path
    firebase_service_account_path: str = "./firebase-service-account.json"

    # CORS: list
    allowed_origins: list[str] = ["http://localhost:5173"]  # Default for local development

    # App environment
    app_env: str = "development"
    log_level: str = "info"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra env vars that are not defined in this model
        # env_nested_delimiter="__", # Uncomment if you want to support nested env vars like DATABASE__HOST=localhost
    )


# ── Singleton settings instance ─────────────────────────────
# Import this anywhere in the app: from app.config import settings
settings = Settings()
