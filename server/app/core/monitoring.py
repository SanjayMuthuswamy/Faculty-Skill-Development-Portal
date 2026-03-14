import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
except Exception:  # pragma: no cover - optional dependency
    sentry_sdk = None


def setup_sentry() -> bool:
    """
    Initialize Sentry if DSN is configured and dependency is installed.
    Returns True when enabled.
    """
    if not settings.SENTRY_DSN:
        return False

    if sentry_sdk is None:
        logger.warning("SENTRY_DSN is set but sentry-sdk is not installed. Monitoring disabled.")
        return False

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=settings.SENTRY_PROFILES_SAMPLE_RATE,
        send_default_pii=False,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
    )
    logger.info("Sentry monitoring initialized for backend.")
    return True
