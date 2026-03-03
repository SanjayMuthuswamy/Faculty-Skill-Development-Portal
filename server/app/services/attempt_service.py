
import logging
from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)

from app.models.attempt import Attempt, AttemptStatus
from app.models.attempt_answer import AttemptAnswer
from app.models.performance_analysis import PerformanceAnalysis, PerformanceAnalysisStatus
from app.models.test import Test
from app.models.test_pack import TestPack
from app.models.question_pack import QuestionPack
from app.models.question import Question
from app.schemas.attempt import AttemptCreate, AttemptAnswerBase
from app.services.llm_service import LLMService

class AttemptService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMService()

    async def start_attempt(self, faculty_id: str, test_id: str) -> Attempt:
        """Create a new in-progress attempt for a faculty member."""
        # Validate test exists first — crashes with AttributeError if skipped
        result = await self.db.execute(select(Test).where(Test.id == test_id))
        test = result.scalar_one_or_none()
        
        if not test:
            logger.error(f"start_attempt: test_id='{test_id}' not found in DB")
            raise ValueError(f"Test '{test_id}' does not exist")
        
        try:
            attempt = Attempt(
                id=str(uuid4()),
                test_id=test_id,
                faculty_id=faculty_id,
                total=test.total_questions,
                status=AttemptStatus.IN_PROGRESS
            )
            self.db.add(attempt)
            await self.db.commit()
            
            # Re-fetch with answers eagerly loaded — prevents MissingGreenlet
            # when FastAPI/Pydantic serializes the response (lazy loading fails in async)
            refreshed = await self.db.execute(
                select(Attempt)
                .where(Attempt.id == attempt.id)
                .options(selectinload(Attempt.answers))
            )
            attempt = refreshed.scalar_one()
            logger.info(f"Created attempt id='{attempt.id}' for faculty='{faculty_id}' test='{test_id}'")
            return attempt
        except Exception as e:
            await self.db.rollback()
            logger.error(f"start_attempt DB error: {e}", exc_info=True)
            raise

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
            select(Attempt)
            .where(Attempt.id == attempt_id)
            .options(
                selectinload(Attempt.answers).selectinload(AttemptAnswer.question),
                selectinload(Attempt.test),
                selectinload(Attempt.faculty),  # BUG-2 fix: eagerly load faculty to avoid MissingGreenlet
            )
        )
        attempt = result.scalar_one_or_none()
        
        if not attempt:
            return None
            
        # 1. Deterministic Scoring
        score = sum(1 for a in attempt.answers if a.is_correct)
        attempt.score = score
        attempt.accuracy = (score / attempt.total * 100) if attempt.total > 0 else 0
        attempt.status = AttemptStatus.SUBMITTED
        attempt.submitted_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(attempt)

        # 2. Trigger Performance Analysis (Enterprise AI Requirement)
        # In a real enterprise app, this would be an event or background task.
        # We'll implement the logic here and assume it's called in a way that doesn't block.
        await self.run_performance_analysis(attempt)
        
        return attempt

    async def run_performance_analysis(self, attempt: Attempt) -> Optional[PerformanceAnalysis]:
        """Runs the LLM-based skill gap analysis after deterministic scoring."""
        try:
            # Prepare data for LLM
            incorrect_questions = []
            for ans in attempt.answers:
                if not ans.is_correct:
                    incorrect_questions.append({
                        "question": ans.question.question_text,
                        "correct_answer": ans.question.correct_option,
                        "user_answer": ans.selected_option
                    })

            report_data = {
                "topic": attempt.test.title,
                "difficulty": attempt.test.difficulty,
                "score": attempt.score,
                "total": attempt.total,
                "percentage": attempt.accuracy,
                "incorrect_questions": incorrect_questions
            }

            # Call LLM
            analysis_data = await self.llm.analyze_performance(report_data)

            # Save Analysis
            # BUG-2 fix: faculty.user_id is the correct access after eager-loading the faculty relationship
            faculty_user_id = attempt.faculty.user_id if attempt.faculty else attempt.faculty_id
            analysis = PerformanceAnalysis(
                id=str(uuid4()),
                attempt_id=attempt.id,
                user_id=faculty_user_id,
                topic=attempt.test.title,
                difficulty=attempt.test.difficulty,
                percentage=attempt.accuracy,
                status=PerformanceAnalysisStatus.COMPLETED if analysis_data else PerformanceAnalysisStatus.FAILED,
                prompt_version="1.0"
            )

            if analysis_data:
                res = analysis_data.analysis
                analysis.next_difficulty = res.next_difficulty
                analysis.strengths = res.strength
                analysis.weaknesses = res.weakness
                analysis.skill_gaps = res.skill_gaps
                analysis.recommendations = res.recommendations
                analysis.raw_llm_output = analysis_data.model_dump()
            else:
                analysis.error_message = "LLM failed to return valid analysis."

            self.db.add(analysis)
            await self.db.commit()
            return analysis

        except Exception as e:
            logger.error(f"Failed to run performance analysis for attempt {attempt.id}: {str(e)}", exc_info=True)
            return None

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

    async def get_attempt(self, attempt_id: str) -> Optional[Attempt]:
        """Fetch a single attempt with its answers for the results page."""
        result = await self.db.execute(
            select(Attempt)
            .where(Attempt.id == attempt_id)
            .options(selectinload(Attempt.answers))
        )
        return result.scalar_one_or_none()
