
from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.attempt import Attempt, AttemptStatus
from app.models.attempt_answer import AttemptAnswer
from app.models.test import Test
from app.models.test_pack import TestPack
from app.models.question_pack import QuestionPack
from app.models.question import Question
from app.schemas.attempt import AttemptCreate, AttemptAnswerBase

class AttemptService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def start_attempt(self, faculty_id: str, test_id: str) -> Attempt:
        # Get test details
        result = await self.db.execute(select(Test).where(Test.id == test_id))
        test = result.scalar_one_or_none()
        
        attempt = Attempt(
            id=str(uuid4()),
            test_id=test_id,
            faculty_id=faculty_id,
            total=test.total_questions,
            status=AttemptStatus.IN_PROGRESS
        )
        self.db.add(attempt)
        await self.db.commit()
        await self.db.refresh(attempt)
        return attempt

    async def submit_answer(self, attempt_id: str, question_id: str, selected_option: str) -> AttemptAnswer:
        # Check correctness
        q_res = await self.db.execute(select(Question).where(Question.id == question_id))
        question = q_res.scalar_one_or_none()
        is_correct = (question.correct_option == selected_option)
        
        # Upsert answer
        ans_res = await self.db.execute(
            select(AttemptAnswer).where(
                AttemptAnswer.attempt_id == attempt_id,
                AttemptAnswer.question_id == question_id
            )
        )
        answer = ans_res.scalar_one_or_none()
        
        if answer:
            answer.selected_option = selected_option
            answer.is_correct = is_correct
        else:
            answer = AttemptAnswer(
                id=str(uuid4()),
                attempt_id=attempt_id,
                question_id=question_id,
                selected_option=selected_option,
                is_correct=is_correct
            )
            self.db.add(answer)
            
        await self.db.commit()
        await self.db.refresh(answer)
        return answer

    async def finish_attempt(self, attempt_id: str) -> Attempt:
        result = await self.db.execute(
            select(Attempt).where(Attempt.id == attempt_id).options(selectinload(Attempt.answers))
        )
        attempt = result.scalar_one_or_none()
        
        if not attempt:
            return None
            
        score = sum(1 for a in attempt.answers if a.is_correct)
        attempt.score = score
        attempt.accuracy = (score / attempt.total * 100) if attempt.total > 0 else 0
        attempt.status = AttemptStatus.SUBMITTED
        attempt.submitted_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(attempt)
        return attempt

    async def bulk_submit(self, attempt_id: str, answers_in: List[AttemptAnswerBase]) -> Attempt:
        # Submit each answer
        for ans in answers_in:
            await self.submit_answer(attempt_id, ans.question_id, ans.selected_option)
        
        # Then finish
        return await self.finish_attempt(attempt_id)

    async def get_faculty_attempts(self, faculty_id: str) -> List[Attempt]:
        result = await self.db.execute(
            select(Attempt)
            .where(Attempt.faculty_id == faculty_id)
            .options(selectinload(Attempt.answers))
        )
        return result.scalars().all()
