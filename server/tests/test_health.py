import asyncio

import pytest
from fastapi import HTTPException

from app.api.v1.routes.health import health_check


class HealthySession:
    async def execute(self, _query) -> None:
        return None


class BrokenSession:
    async def execute(self, _query) -> None:
        raise RuntimeError("db down")


def test_health_check_returns_ok_when_database_is_available() -> None:
    response = asyncio.run(health_check(session=HealthySession()))
    assert response == {"status": "ok", "database": "connected"}


def test_health_check_raises_503_when_database_is_unavailable() -> None:
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(health_check(session=BrokenSession()))

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == {"status": "error", "database": "disconnected"}
