
from datetime import datetime
from typing import List, Optional
from uuid import uuid4
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
        
        if set_in.source == "PACK" or set_in.source == "WEAKNESS":
            # Fetch from existing question packs
            query = select(Question).join(QuestionPack).where(
                QuestionPack.domain == set_in.domain
            )
            # Add difficulty filter if needed in future
            
            result = await self.db.execute(query.limit(set_in.count))
            source_questions = result.scalars().all()
            
            for q in source_questions:
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
            else:
                # Fallback to mock AI questions
                for i in range(set_in.count):
                    questions_to_add.append(PracticeSetQuestion(
                        id=str(uuid4()),
                        set_id=db_set.id,
                        question_text=f"Sample AI Question {i+1} about {topic}: What is the core principle?",
                        option_a="A) Concept Alpha",
                        option_b="B) Concept Beta",
                        option_c="C) Concept Gamma",
                        option_d="D) Concept Delta",
                        correct_option="A",
                        explanation=f"This is a fallback placeholder explanation for {topic}."
                    ))
        
        if not questions_to_add:
            # Fallback if no questions found
            questions_to_add.append(PracticeSetQuestion(
                id=str(uuid4()),
                set_id=db_set.id,
                question_text="Sample Question: What is the primary focus of this domain?",
                option_a="A) Concept 1",
                option_b="B) Concept 2",
                option_c="C) Concept 3",
                option_d="D) Concept 4",
                correct_option="A",
                explanation="Concept 1 is the primary focus."
            ))

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
            .where(PracticeSet.id != None) # Dummy filter to allow join/options if needed
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
        db_set.completed_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(db_set)
        return db_set
