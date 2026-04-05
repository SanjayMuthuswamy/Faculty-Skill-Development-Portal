import json
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    PROJECT_NAME: str = "Faculty Skill Development Portal"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False
    ENABLE_API_DOCS: bool | None = None
    ENABLE_GZIP: bool = True
    GZIP_MINIMUM_SIZE: int = 1000
    ALLOWED_HOSTS: list[str] = ["*"]
    ENABLE_APP_CACHE: bool = True
    APP_CACHE_TTL_SECONDS: int = 120
    APP_CACHE_SHORT_TTL_SECONDS: int = 45

    # Database - Override with DATABASE_URL environment variable
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/fsdp_db"

    # JWT Configuration - MUST be set in environment variables
    JWT_ACCESS_SECRET: str = "change-this-secret-key-in-production"
    JWT_REFRESH_SECRET: str = "change-this-refresh-secret-key-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    BOOTSTRAP_DEMO_USERS: bool = False
    DEMO_ADMIN_EMAIL: str = "admin@fsdp.com"
    DEMO_ADMIN_PASSWORD: str | None = None
    DEMO_FACULTY_EMAIL: str = "faculty@fsdp.com"
    DEMO_FACULTY_PASSWORD: str | None = None

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

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

    # Observability
    SENTRY_DSN: str | None = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    SENTRY_PROFILES_SAMPLE_RATE: float = 0.0

    @field_validator("DEBUG", mode="before")
    @classmethod
    def _parse_debug_value(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            truthy = {"1", "true", "yes", "on", "debug", "development", "dev"}
            falsy = {"0", "false", "no", "off", "release", "prod", "production"}
            if normalized in truthy:
                return True
            if normalized in falsy:
                return False
            # Treat unrelated ambient values like DEBUG=WARN as disabled
            # instead of crashing settings initialization.
            return False
        return bool(value)

    @field_validator("CORS_ORIGINS", "ALLOWED_HOSTS", mode="before")
    @classmethod
    def _parse_list_settings(cls, value):
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except json.JSONDecodeError:
                    pass
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return value

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _normalize_asyncpg_ssl_param(cls, value):
        """Normalize DB URL for async runtime and asyncpg SSL parameters."""
        if not isinstance(value, str):
            return value
        normalized = value
        if normalized.startswith("postgresql://"):
            normalized = normalized.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif normalized.startswith("postgres://"):
            normalized = normalized.replace("postgres://", "postgresql+asyncpg://", 1)

        if not normalized.startswith("postgresql+asyncpg://"):
            return normalized

        parts = urlsplit(normalized)
        if not parts.query:
            return normalized

        query_pairs = parse_qsl(parts.query, keep_blank_values=True)
        has_ssl = any(k == "ssl" for k, _ in query_pairs)
        if has_ssl:
            return normalized

        updated = False
        normalized_pairs: list[tuple[str, str]] = []
        for key, val in query_pairs:
            if key == "sslmode":
                normalized_pairs.append(("ssl", val))
                updated = True
            else:
                normalized_pairs.append((key, val))

        if not updated:
            return normalized

        new_query = urlencode(normalized_pairs)
        return urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))

    @model_validator(mode="after")
    def _apply_production_defaults(self):
        if self.ENABLE_API_DOCS is None:
            self.ENABLE_API_DOCS = self.ENVIRONMENT != "production"

        if self.ENVIRONMENT == "production":
            weak_values = {
                "change-this-secret-key-in-production",
                "change-this-refresh-secret-key-in-production",
                "your-access-secret-key-change-in-production",
                "your-refresh-secret-key-change-in-production",
                "your-super-secret-access-key-change-in-production",
                "your-super-secret-refresh-key-change-in-production",
            }

            for secret_name in ("JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"):
                secret_value = getattr(self, secret_name)
                if secret_value in weak_values or len(secret_value) < 32:
                    raise ValueError(
                        f"{secret_name} must be at least 32 characters and not a placeholder in production."
                    )

            if not self.CORS_ORIGINS:
                raise ValueError("CORS_ORIGINS must include at least one allowed origin in production.")

            if "*" in self.ALLOWED_HOSTS:
                raise ValueError("ALLOWED_HOSTS cannot contain '*' in production.")

        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
