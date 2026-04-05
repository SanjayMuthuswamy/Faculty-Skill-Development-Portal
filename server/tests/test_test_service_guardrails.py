import asyncio
from types import SimpleNamespace

import pytest

from app.models.enums import Difficulty
from app.models.skill import SkillDomain
from app.schemas.test import TestCreate
from app.services.test_service import TestService


class _FakeScalarResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


class _FakeExecuteResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return _FakeScalarResult(self._items)


class _FakeSession:
    def __init__(self, execute_items=None):
        self.execute_items = execute_items or []
        self.commit_calls = 0
        self.added = []

    async def execute(self, _query):
        return _FakeExecuteResult(self.execute_items)

    async def commit(self):
        self.commit_calls += 1

    async def refresh(self, _obj):
        return None

    def add(self, obj):
        self.added.append(obj)


def test_create_published_test_requires_real_questions(monkeypatch) -> None:
    service = TestService(_FakeSession())

    async def fake_total_questions(_pack_ids, _question_ids):
        return 0

    monkeypatch.setattr(service, "_compute_total_questions", fake_total_questions)

    with pytest.raises(ValueError, match="at least one valid linked question"):
        asyncio.run(
            service.create_test(
                TestCreate(
                    title="Published test without linked questions",
                    description="This description is long enough for publish validation.",
                    domain=SkillDomain.AI,
                    difficulty=Difficulty.BEGINNER,
                    is_published=True,
                    pack_ids=["missing-pack"],
                ),
                user_id="admin-1",
            )
        )


def test_get_all_is_read_only_when_test_has_no_questions() -> None:
    db_test = SimpleNamespace(
        id="test-1",
        pack_links=[],
        question_links=[],
        total_questions=7,
        is_published=False,
    )
    session = _FakeSession(execute_items=[db_test])
    service = TestService(session)

    tests = asyncio.run(service.get_all())

    assert len(tests) == 1
    assert tests[0].questions == []
    assert tests[0].pack_ids == []
    assert tests[0].question_ids == []
    assert tests[0].total_questions == 0
    assert session.commit_calls == 0
