import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "Siddhi"
    API_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "postgresql+psycopg://siddhi_user:siddhi_password@127.0.0.1:5432/siddhi"
    SECRET_KEY: str = "dev-secret-key-please-change-in-production-1234567890"
    ACCESS_TOKEN_MINUTES: int = 20
    SESSION_REFRESH_DAYS: int = 7
    FRONTEND_ORIGIN: str = "http://127.0.0.1:5173"
    ALLOWED_ORIGINS: List[str] = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:8000",
        "http://localhost:8000"
    ]
    UPLOAD_DIR: str = "./var/uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
