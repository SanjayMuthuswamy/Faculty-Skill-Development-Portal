import asyncio
from types import SimpleNamespace

import pytest

from app.db import init_db as init_db_module


class UnusedSessionContext:
    async def __aenter__(self):
        raise AssertionError("Session should not be opened for this test")

    async def __aexit__(self, exc_type, exc, tb):
        return False


def test_init_db_rejects_demo_bootstrap_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        init_db_module,
        "settings",
        SimpleNamespace(
            ENVIRONMENT="production",
            BOOTSTRAP_DEMO_USERS=True,
            DEMO_ADMIN_PASSWORD="secret",
            DEMO_FACULTY_PASSWORD="secret",
        ),
    )
    monkeypatch.setattr(init_db_module, "SessionLocal", lambda: UnusedSessionContext())

    with pytest.raises(RuntimeError, match="BOOTSTRAP_DEMO_USERS must remain disabled in production"):
        asyncio.run(init_db_module.init_db())
