
from typing import Optional, List
from uuid import uuid4

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.test import Test
from app.models.test_pack import TestPack
from app.models.test_question import TestQuestion
from app.models.question_pack import QuestionPack
from app.schemas.test import TestCreate

class TestService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _attach_serialized_fields(self, db_test: Test) -> None:
        questions = []
        seen_ids = set()

        for link in db_test.pack_links:
            if link.pack:
                for question in link.pack.questions:
                    if question.id not in seen_ids:
                        questions.append(question)
                        seen_ids.add(question.id)

        for link in db_test.question_links:
            if link.question and link.question.id not in seen_ids:
                questions.append(link.question)
                seen_ids.add(link.question.id)

        db_test.questions = questions
        db_test.pack_ids = [link.pack_id for link in db_test.pack_links]
        db_test.question_ids = [link.question_id for link in db_test.question_links]

    async def _compute_total_questions(self, pack_ids: List[str], question_ids: List[str]) -> int:
        seen_ids = set(question_ids)
        for pack_id in pack_ids:
            pack_res = await self.db.execute(
                select(QuestionPack)
                .where(QuestionPack.id == pack_id)
                .options(selectinload(QuestionPack.questions))
            )
            pack = pack_res.scalar_one_or_none()
            if pack:
                for question in pack.questions:
                    seen_ids.add(question.id)
        return len(seen_ids)

    async def create_test(self, test_in: TestCreate, user_id: str) -> Test:
        pack_ids = list(dict.fromkeys(test_in.pack_ids))
        question_ids = list(dict.fromkeys(test_in.question_ids))
        total_q = await self._compute_total_questions(pack_ids, question_ids)

        db_test = Test(
            id=str(uuid4()),
            created_by_id=user_id,
            title=test_in.title,
            description=test_in.description,
            short_description=test_in.short_description,
            instructions=test_in.instructions,
            tags=test_in.tags,
            domain=test_in.domain,
            difficulty=test_in.difficulty,
            pass_marks=test_in.pass_marks,
            time_limit_minutes=test_in.time_limit_minutes,
            is_published=test_in.is_published,
            total_questions=total_q
        )
        self.db.add(db_test)

        # Link packs
        for pack_id in pack_ids:
            link = TestPack(test_id=db_test.id, pack_id=pack_id)
            self.db.add(link)

        # Link individual questions
        for question_id in question_ids:
            q_link = TestQuestion(test_id=db_test.id, question_id=question_id)
            self.db.add(q_link)

        await self.db.commit()
        await self.db.refresh(db_test)
        return db_test

    async def get_all(self, skip: int = 0, limit: int = 100, published_only: bool = False) -> List[Test]:
        query = (
            select(Test)
            .offset(skip)
            .limit(limit)
            .options(
                selectinload(Test.pack_links).selectinload(TestPack.pack).selectinload(QuestionPack.questions),
                selectinload(Test.question_links).selectinload(TestQuestion.question)
            )
        )
        if published_only:
            query = query.where(Test.is_published == True)

        result = await self.db.execute(query)
        db_tests = result.scalars().all()

        for db_test in db_tests:
            self._attach_serialized_fields(db_test)

        return db_tests

    async def get_test(self, test_id: str) -> Optional[Test]:
        result = await self.db.execute(
            select(Test)
            .where(Test.id == test_id)
            .options(
                selectinload(Test.pack_links).selectinload(TestPack.pack).selectinload(QuestionPack.questions),
                selectinload(Test.question_links).selectinload(TestQuestion.question)
            )
        )
        db_test = result.scalar_one_or_none()
        if not db_test:
            return None

        self._attach_serialized_fields(db_test)
        return db_test

    async def update_test(self, test_id: str, test_in: dict) -> Optional[Test]:
        db_test = await self.get_test(test_id)
        if not db_test:
            return None

        has_pack_ids = "pack_ids" in test_in
        has_question_ids = "question_ids" in test_in
        pack_ids = test_in.pop("pack_ids", None)
        question_ids = test_in.pop("question_ids", None)

        for field, value in test_in.items():
            if hasattr(db_test, field) and field not in ["id", "created_at", "created_by_id"]:
                setattr(db_test, field, value)

        if pack_ids is not None:
            pack_ids = list(dict.fromkeys(pack_ids))
            await self.db.execute(delete(TestPack).where(TestPack.test_id == test_id))
            for pack_id in pack_ids:
                self.db.add(TestPack(test_id=test_id, pack_id=pack_id))
        else:
            pack_ids = [link.pack_id for link in db_test.pack_links]

        if question_ids is not None:
            question_ids = list(dict.fromkeys(question_ids))
            await self.db.execute(delete(TestQuestion).where(TestQuestion.test_id == test_id))
            for question_id in question_ids:
                self.db.add(TestQuestion(test_id=test_id, question_id=question_id))
        else:
            question_ids = [link.question_id for link in db_test.question_links]

        if has_pack_ids or has_question_ids:
            db_test.total_questions = await self._compute_total_questions(pack_ids, question_ids)

        await self.db.commit()
        return await self.get_test(test_id)

    async def delete_test(self, test_id: str) -> bool:
        db_test = await self.get_test(test_id)
        if not db_test:
            return False
        
        await self.db.delete(db_test)
        await self.db.commit()
        return True
