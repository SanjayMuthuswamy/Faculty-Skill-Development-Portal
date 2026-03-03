
from typing import Optional, List
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.test import Test
from app.models.test_pack import TestPack
from app.models.test_question import TestQuestion
from app.models.question_pack import QuestionPack
from app.models.question import Question
from app.schemas.test import TestCreate, TestUpdate

class TestService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_test(self, test_in: TestCreate, user_id: str) -> Test:
        db_test = Test(
            id=str(uuid4()),
            created_by_id=user_id,
            title=test_in.title,
            description=test_in.description,
            domain=test_in.domain,
            difficulty=test_in.difficulty,
            pass_marks=test_in.pass_marks,
            time_limit_minutes=test_in.time_limit_minutes,
            total_questions=0 # To be calculated
        )
        
        # Link packs
        total_q = 0
        for pack_id in test_in.pack_ids:
            link = TestPack(test_id=db_test.id, pack_id=pack_id)
            self.db.add(link)
            
            # Count questions
            pack_res = await self.db.execute(select(QuestionPack).where(QuestionPack.id == pack_id).options(selectinload(QuestionPack.questions)))
            pack = pack_res.scalar_one_or_none()
            if pack:
                total_q += len(pack.questions)
        
        # Link individual questions
        for question_id in test_in.question_ids:
            # Check if already in a selected pack to avoid double counting
            # For simplicity, we just add the link. The frontend handles selection logic.
            q_link = TestQuestion(test_id=db_test.id, question_id=question_id)
            self.db.add(q_link)
            total_q += 1
            
        db_test.total_questions = total_q
        
        self.db.add(db_test)
        await self.db.commit()
        await self.db.refresh(db_test)
        return db_test

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Test]:
        query = (
            select(Test)
            .offset(skip)
            .limit(limit)
            .options(
                selectinload(Test.pack_links).selectinload(TestPack.pack).selectinload(QuestionPack.questions),
                selectinload(Test.question_links).selectinload(TestQuestion.question)
            )
        )
        result = await self.db.execute(query)
        db_tests = result.scalars().all()
        
        # Populate questions for each test for serialization
        for db_test in db_tests:
            questions = []
            seen_ids = set()
            
            for link in db_test.pack_links:
                if link.pack:
                    for q in link.pack.questions:
                        if q.id not in seen_ids:
                            questions.append(q)
                            seen_ids.add(q.id)
                            
            for link in db_test.question_links:
                if link.question and link.question.id not in seen_ids:
                    questions.append(link.question)
                    seen_ids.add(link.question.id)
            
            db_test.questions = questions
            
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
            
        # Flatten questions for easier frontend consumption
        questions = []
        seen_ids = set()
        
        # From packs
        for link in db_test.pack_links:
            if link.pack:
                for q in link.pack.questions:
                    if q.id not in seen_ids:
                        questions.append(q)
                        seen_ids.add(q.id)
                        
        # From individual links
        for link in db_test.question_links:
            if link.question and link.question.id not in seen_ids:
                questions.append(link.question)
                seen_ids.add(link.question.id)
                
        # Attach to the object (this will be used by the schema)
        db_test.questions = questions
        return db_test

    async def update_test(self, test_id: str, test_in: dict) -> Optional[Test]:
        db_test = await self.get_test(test_id)
        if not db_test:
            return None
        
        # We don't handle pack/question link updates in this simple update for now
        # Just basic fields
        for field, value in test_in.items():
            if hasattr(db_test, field) and field not in ["id", "created_at", "created_by_id"]:
                setattr(db_test, field, value)
        
        await self.db.commit()
        await self.db.refresh(db_test)
        return db_test

    async def delete_test(self, test_id: str) -> bool:
        db_test = await self.get_test(test_id)
        if not db_test:
            return False
        
        await self.db.delete(db_test)
        await self.db.commit()
        return True
