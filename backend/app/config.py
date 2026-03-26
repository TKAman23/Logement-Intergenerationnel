"""
============================================================
config.py — App Configuration via Pydantic Settings
============================================================

Reads environment variables from .env file automatically.
All settings are type-validated by Pydantic.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Pydantic automatically reads from a .env file in the working directory.
    """

    # Firebase service account JSON file path
    firebase_service_account_path: str = "./firebase-service-account.json"

    # CORS: comma-separated origins string → parsed into list
    allowed_origins_str: str = "http://localhost:5173"

    @property
    def allowed_origins(self) -> List[str]:
        """Parse comma-separated origins string into a Python list."""
        return [o.strip() for o in self.allowed_origins_str.split(",")]

    # App environment
    app_env: str = "development"
    log_level: str = "info"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Map .env key ALLOWED_ORIGINS → allowed_origins_str
        fields = {
            "allowed_origins_str": {"env": "ALLOWED_ORIGINS"}
        }


# ── Singleton settings instance ─────────────────────────────
# Import this anywhere in the app: from app.config import settings
settings = Settings()
