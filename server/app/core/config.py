
from typing import Any
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    PROJECT_NAME: str = "Faculty Skill Development Portal"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    # Database - Override with DATABASE_URL environment variable
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/fsdp_db"

    # JWT Configuration - MUST be set in environment variables
    JWT_ACCESS_SECRET: str = "change-this-secret-key-in-production"
    JWT_REFRESH_SECRET: str = "change-this-refresh-secret-key-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # News API
    NEWSDATA_API_KEY: str | None = None
    NEWSDATA_BASE_URL: str = "https://newsdata.io/api/1/latest"
    NEWS_CACHE_TTL_SECONDS: int = 21600  # 6 hours

    # OpenRouter AI
    OPENROUTER_API_KEY: str | None = None
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1/chat/completions"
    OPENROUTER_MODEL: str = "openrouter/auto"
    LLM_TIMEOUT_SECONDS: int = 60
    LLM_MAX_RETRIES: int = 2

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
