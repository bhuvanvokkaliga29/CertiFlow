"""Application configuration using pydantic-settings."""

import json
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "CertiFlow"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production-minimum-32-chars"
    API_V1_STR: str = "/api/v1"
    PUBLIC_URL: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./certiflow.db"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Storage
    STORAGE_DIR: str = "./storage"

    # Auth
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    ALGORITHM: str = "HS256"

    # CORS
    ALLOWED_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    @field_validator("ALLOWED_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",")]
        return v

    # Limits
    MAX_RECIPIENTS_PER_JOB: int = 1000
    MAX_CSV_ROWS: int = 1000
    MAX_UPLOAD_SIZE_MB: int = 10
    MAX_RETRY_COUNT: int = 3

    # SMTP (optional)
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "no-reply@certiflow.local"

    # AI (optional)
    AI_PROVIDER: str = "none"
    AI_API_KEY: str = ""

    # Worker mode: "celery" or "thread" (thread for local dev without Redis)
    WORKER_MODE: str = "thread"

    @property
    def certificates_dir(self) -> str:
        path = os.path.join(self.STORAGE_DIR, "certificates")
        os.makedirs(path, exist_ok=True)
        return path

    @property
    def uploads_dir(self) -> str:
        path = os.path.join(self.STORAGE_DIR, "uploads")
        os.makedirs(path, exist_ok=True)
        return path

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.DATABASE_URL

    @property
    def sync_database_url(self) -> str:
        """Convert async URL to sync for Alembic / Celery."""
        url = self.DATABASE_URL
        if url.startswith("sqlite+aiosqlite"):
            return url.replace("sqlite+aiosqlite", "sqlite")
        if url.startswith("postgresql+asyncpg"):
            return url.replace("postgresql+asyncpg", "postgresql+psycopg2")
        return url


settings = Settings()
