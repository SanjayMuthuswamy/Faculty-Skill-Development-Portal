from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.base import CRUDBase
from app.models.question_pack import QuestionPack
from app.models.question import Question
from app.models.test import Test
from app.models.attempt import Attempt
from app.models.attempt_answer import AttemptAnswer
from app.models.enums import AttemptStatus, QuestionOption
from app.schemas.assessment import (
    QuestionPackCreate, QuestionCreate, TestCreate, AttemptCreate, AttemptUpdate, SubmitAttempt
)

class CRUDQuestionPack(CRUDBase[QuestionPack, QuestionPackCreate, QuestionPackCreate]):
     async def create(self, db: AsyncSession, *, obj_in: QuestionPackCreate, user_id: str) -> QuestionPack:
        db_obj = QuestionPack(
            id=str(uuid.uuid4()),
            created_by_id=user_id,
            **obj_in.model_dump()
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

     async def get_with_questions(self, db: AsyncSession, id: str) -> Optional[QuestionPack]:
        result = await db.execute(
            select(QuestionPack).options(selectinload(QuestionPack.questions)).filter(QuestionPack.id == id)
        )
        return result.scalars().first()

question_pack = CRUDQuestionPack(QuestionPack)

class CRUDQuestion(CRUDBase[Question, QuestionCreate, QuestionCreate]):
    async def create(self, db: AsyncSession, *, obj_in: QuestionCreate, pack_id: str) -> Question:
        db_obj = Question(
            id=str(uuid.uuid4()),
            pack_id=pack_id,
            **obj_in.model_dump()
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

question = CRUDQuestion(Question)

from app.models.test_pack import TestPack

class CRUDTest(CRUDBase[Test, TestCreate, TestCreate]):
    async def create(self, db: AsyncSession, *, obj_in: TestCreate, created_by_id: str) -> Test:
        obj_in_data = obj_in.model_dump(exclude={"pack_ids"})
        db_obj = Test(
            id=str(uuid.uuid4()),
            created_by_id=created_by_id,
            **obj_in_data
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        
        # Link packs
        for pack_id in obj_in.pack_ids:
            test_pack = TestPack(
                id=str(uuid.uuid4()),
                test_id=db_obj.id,
                pack_id=pack_id
            )
            db.add(test_pack)
            
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

test = CRUDTest(Test)

class CRUDAttempt(CRUDBase[Attempt, AttemptCreate, AttemptUpdate]):
    async def create(self, db: AsyncSession, *, obj_in: AttemptCreate, faculty_id: str) -> Attempt:
        db_obj = Attempt(
            id=str(uuid.uuid4()),
            faculty_id=faculty_id,
            test_id=obj_in.test_id,
            status=AttemptStatus.IN_PROGRESS
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
        
    async def get_with_answers(self, db: AsyncSession, id: str) -> Optional[Attempt]:
        result = await db.execute(
            select(Attempt).options(selectinload(Attempt.answers)).filter(Attempt.id == id)
        )
        return result.scalars().first()

    async def get_by_faculty(self, db: AsyncSession, *, faculty_id: str) -> List[Attempt]:
        result = await db.execute(
            select(Attempt).options(selectinload(Attempt.answers)).filter(Attempt.faculty_id == faculty_id)
        )
        return result.scalars().all()

    async def submit(self, db: AsyncSession, *, attempt_id: str, submission: SubmitAttempt) -> Attempt:
        attempt = await self.get(db, attempt_id)
        if not attempt:
            return None
            
        # calculate score
        score = 0
        correct_count = 0
        total_questions = len(submission.answers)
        
        for answer_data in submission.answers:
            # Fetch question correct option
            # This is N+1, but simple for now. Better to fetch all questions in one go.
             q_result = await db.execute(select(Question).filter(Question.id == answer_data.question_id))
             question = q_result.scalars().first()
             
             is_correct = False
             if question and question.correct_option == answer_data.selected_option:
                 score += 1 # simplistic scoring
                 correct_count += 1
                 is_correct = True
                 
             # Save AttemptAnswer
             attempt_answer = AttemptAnswer(
                 id=str(uuid.uuid4()),
                 attempt_id=attempt_id,
                 question_id=answer_data.question_id,
                 selected_option=answer_data.selected_option,
                 is_correct=is_correct
             )
             db.add(attempt_answer)

        attempt.score = score
        attempt.total = total_questions # or total marks
        attempt.accuracy = (correct_count / total_questions) * 100 if total_questions > 0 else 0
        attempt.status = AttemptStatus.SUBMITTED
        attempt.submitted_at = datetime.now(timezone.utc)
        
        db.add(attempt)
        await db.commit()
        await db.refresh(attempt)
        return attempt

attempt = CRUDAttempt(Attempt)
