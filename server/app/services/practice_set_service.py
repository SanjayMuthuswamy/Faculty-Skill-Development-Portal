
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4
import re
import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.practice_set import PracticeSet, PracticeSetQuestion
from app.models.question import Question
from app.models.question_pack import QuestionPack
from app.schemas.practice_set import PracticeSetCreate, PracticeSetResultSubmit

from app.services.llm_service import LLMService

class PracticeSetService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMService()

    @staticmethod
    def _normalize_question_text(text: str) -> str:
        return re.sub(r"\s+", " ", (text or "").strip().lower())

    async def _get_seen_question_texts(self, faculty_id: str) -> set[str]:
        """Return normalized question text already shown to this faculty."""
        result = await self.db.execute(
            select(PracticeSetQuestion.question_text)
            .join(PracticeSet, PracticeSetQuestion.set_id == PracticeSet.id)
            .where(PracticeSet.faculty_id == faculty_id)
        )
        return {
            self._normalize_question_text(question_text)
            for question_text in result.scalars().all()
            if question_text
        }

    async def generate_set(self, faculty_id: str, set_in: PracticeSetCreate) -> PracticeSet:
        # 1. Create the PracticeSet record
        db_set = PracticeSet(
            id=str(uuid4()),
            faculty_id=faculty_id,
            domain=set_in.domain,
            difficulty=set_in.difficulty,
            source=set_in.source,
            topic=set_in.topic
        )
        self.db.add(db_set)
        
        # 2. Get questions based on source
        questions_to_add = []
        
        seen_texts = await self._get_seen_question_texts(faculty_id)
        chosen_texts: set[str] = set()

        if set_in.source == "PACK" or set_in.source == "WEAKNESS":
            # Fetch from existing question packs
            query = select(Question).join(QuestionPack).where(
                QuestionPack.domain == set_in.domain
            )
            # Add difficulty filter if needed in future

            # Pull a larger pool and de-duplicate against previous sets.
            result = await self.db.execute(query.limit(max(set_in.count * 6, 20)))
            source_questions = result.scalars().all()
            random.shuffle(source_questions)

            for q in source_questions:
                normalized = self._normalize_question_text(q.question_text)
                if normalized in chosen_texts or normalized in seen_texts:
                    continue
                questions_to_add.append(PracticeSetQuestion(
                    id=str(uuid4()),
                    set_id=db_set.id,
                    question_text=q.question_text,
                    option_a=q.option_a,
                    option_b=q.option_b,
                    option_c=q.option_c,
                    option_d=q.option_d,
                    correct_option=q.correct_option,
                    explanation=q.explanation
                ))
                chosen_texts.add(normalized)
                if len(questions_to_add) >= set_in.count:
                    break

            if not questions_to_add:
                raise ValueError(
                    f"No published questions available for domain '{set_in.domain}'."
                )
        
        elif set_in.source == "CUSTOM":
            # Generate real AI questions based on topic
            topic = set_in.topic or "Professional Development"
            ai_response = await self.llm.generate_practice_questions(
                topic=topic,
                difficulty=set_in.difficulty,
                count=set_in.count
            )

            if ai_response and ai_response.questions:
                for q_ai in ai_response.questions:
                    normalized = self._normalize_question_text(q_ai.question_text)
                    if normalized in chosen_texts or normalized in seen_texts:
                        continue
                    questions_to_add.append(PracticeSetQuestion(
                        id=str(uuid4()),
                        set_id=db_set.id,
                        question_text=q_ai.question_text,
                        option_a=q_ai.option_a,
                        option_b=q_ai.option_b,
                        option_c=q_ai.option_c,
                        option_d=q_ai.option_d,
                        correct_option=q_ai.correct_option,
                        explanation=q_ai.explanation
                    ))
                    chosen_texts.add(normalized)

                # If duplicates reduced the set, request additional variants.
                refill_attempt = 1
                while len(questions_to_add) < set_in.count and refill_attempt <= 2:
                    refill_count = set_in.count - len(questions_to_add)
                    extra = await self.llm.generate_practice_questions(
                        topic=f"{topic} variation set {refill_attempt}",
                        difficulty=set_in.difficulty,
                        count=refill_count,
                    )
                    if not extra or not extra.questions:
                        break
                    for q_ai in extra.questions:
                        normalized = self._normalize_question_text(q_ai.question_text)
                        if normalized in chosen_texts or normalized in seen_texts:
                            continue
                        questions_to_add.append(PracticeSetQuestion(
                            id=str(uuid4()),
                            set_id=db_set.id,
                            question_text=q_ai.question_text,
                            option_a=q_ai.option_a,
                            option_b=q_ai.option_b,
                            option_c=q_ai.option_c,
                            option_d=q_ai.option_d,
                            correct_option=q_ai.correct_option,
                            explanation=q_ai.explanation
                        ))
                        chosen_texts.add(normalized)
                        if len(questions_to_add) >= set_in.count:
                            break
                    refill_attempt += 1
            else:
                raise RuntimeError(
                    "Unable to generate custom practice questions right now. "
                    "Please try again when AI service is available."
                )
        
        if not questions_to_add:
            raise ValueError("Practice set generation failed: no questions resolved.")

        for pq in questions_to_add:
            self.db.add(pq)
            
        await self.db.commit()
        await self.db.refresh(db_set)
        
        # Load questions for return
        result = await self.db.execute(
            select(PracticeSet)
            .where(PracticeSet.id == db_set.id)
            .options(selectinload(PracticeSet.questions))
        )
        return result.scalar_one()

    async def get_sets_by_faculty(self, faculty_id: str) -> List[PracticeSet]:
        result = await self.db.execute(
            select(PracticeSet)
            .where(PracticeSet.faculty_id == faculty_id)
            .options(selectinload(PracticeSet.questions))
            .order_by(PracticeSet.created_at.desc())
        )
        return result.scalars().all()

    async def get_set(self, set_id: str) -> Optional[PracticeSet]:
        result = await self.db.execute(
            select(PracticeSet)
            .where(PracticeSet.id == set_id)
            .options(selectinload(PracticeSet.questions))
        )
        return result.scalar_one_or_none()

    async def submit_result(self, set_id: str, result_in: PracticeSetResultSubmit) -> Optional[PracticeSet]:
        db_set = await self.get_set(set_id)
        if not db_set:
            return None
            
        db_set.score = result_in.score
        db_set.accuracy = result_in.accuracy
        db_set.completed_at = datetime.now(timezone.utc)
        
        await self.db.commit()
        await self.db.refresh(db_set)
        return db_set
