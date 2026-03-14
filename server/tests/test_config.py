from pydantic import ValidationError

from app.core.config import Settings


def test_debug_tolerates_unexpected_string_values() -> None:
    settings = Settings(DEBUG="WARN")
    assert settings.DEBUG is False


def test_production_rejects_wildcard_allowed_hosts() -> None:
    try:
        Settings(
            ENVIRONMENT="production",
            JWT_ACCESS_SECRET="x" * 32,
            JWT_REFRESH_SECRET="y" * 32,
            CORS_ORIGINS=["https://example.com"],
            ALLOWED_HOSTS=["*"],
        )
    except ValidationError as exc:
        assert "ALLOWED_HOSTS cannot contain '*'" in str(exc)
    else:
        raise AssertionError("Expected production settings validation to fail")
