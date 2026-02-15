from typing import Any
import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database - support both PostgreSQL and SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./fsdp.db")

    # JWT Configuration
    JWT_ACCESS_SECRET: str = "your-super-secret-access-key-change-in-production"
    JWT_REFRESH_SECRET: str = "your-super-secret-refresh-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Server
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
