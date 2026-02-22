
from typing import List, Optional
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.question_draft import QuestionDraftBatch, QuestionDraft, DraftBatchStatus, QuestionDraftStatus
from app.models.question_pack import QuestionPack
from app.models.question import Question
from app.schemas.question_draft import QuestionDraftBatchCreate, PublishConfig, QuestionDraftUpdate
from app.services.question_pack_service import QuestionPackService

class AIQuestionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_draft(self, batch_in: QuestionDraftBatchCreate, user_id: str) -> QuestionDraftBatch:
        # Create the batch
        batch = QuestionDraftBatch(
            id=str(uuid4()),
            topic=batch_in.topic,
            domain=batch_in.domain,
            difficulty=batch_in.difficulty,
            created_by_id=user_id
        )
        self.db.add(batch)
        
        # In a real app, we would call an LLM here.
        # For this migration, we'll generate mock questions based on the topic.
        for i in range(batch_in.count):
            q = QuestionDraft(
                id=str(uuid4()),
                batch_id=batch.id,
                question_text=f"Sample Question {i+1} about {batch_in.topic}: What is the primary purpose of {batch_in.prompt[:20]}...?",
                option_a="A) Option Alpha",
                option_b="B) Option Beta",
                option_c="C) Option Gamma",
                option_d="D) Option Delta",
                correct_option="A",
                explanation=f"This is a sample explanation for question {i+1} generated from the prompt.",
                draft_status=QuestionDraftStatus.PENDING
            )
            self.db.add(q)
            
        await self.db.commit()
        await self.db.refresh(batch)
        
        # Load questions
        result = await self.db.execute(
            select(QuestionDraftBatch)
            .where(QuestionDraftBatch.id == batch.id)
            .options(selectinload(QuestionDraftBatch.questions))
        )
        return result.scalar_one()

    async def get_batches(self, user_id: str) -> List[QuestionDraftBatch]:
        result = await self.db.execute(
            select(QuestionDraftBatch)
            .where(QuestionDraftBatch.created_by_id == user_id)
            .options(selectinload(QuestionDraftBatch.questions))
        )
        return result.scalars().all()

    async def get_batch_by_id(self, batch_id: str) -> Optional[QuestionDraftBatch]:
        result = await self.db.execute(
            select(QuestionDraftBatch)
            .where(QuestionDraftBatch.id == batch_id)
            .options(selectinload(QuestionDraftBatch.questions))
        )
        return result.scalar_one_or_none()

    async def update_question(self, batch_id: str, question_index: int, update_in: QuestionDraftUpdate) -> Optional[QuestionDraft]:
        batch = await self.get_batch_by_id(batch_id)
        if not batch or question_index >= len(batch.questions):
            return None
        
        question = batch.questions[question_index]
        for field, value in update_in.dict(exclude_unset=True).items():
            setattr(question, field, value)
            
        await self.db.commit()
        await self.db.refresh(question)
        return question

    async def approve_question(self, batch_id: str, question_index: int) -> bool:
        batch = await self.get_batch_by_id(batch_id)
        if not batch or question_index >= len(batch.questions):
            return False
            
        batch.questions[question_index].draft_status = QuestionDraftStatus.APPROVED
        await self.db.commit()
        return True

    async def reject_question(self, batch_id: str, question_index: int) -> bool:
        batch = await self.get_batch_by_id(batch_id)
        if not batch or question_index >= len(batch.questions):
            return False
            
        batch.questions[question_index].draft_status = QuestionDraftStatus.REJECTED
        await self.db.commit()
        return True

    async def publish_to_pack(self, batch_id: str, config: PublishConfig) -> bool:
        batch = await self.get_batch_by_id(batch_id)
        if not batch:
            return False
            
        pack_service = QuestionPackService(self.db)
        
        # Find or create pack
        pack_id = config.existingPackId
        if not pack_id:
            # Create new pack
            new_pack = await pack_service.create_pack({
                "pack_name": config.packName or f"Generated Pack {batch.topic}",
                "domain": config.domain,
                "topic": config.topic,
                "difficulty": config.difficulty,
                "description": config.description
            }, batch.created_by_id)
            pack_id = new_pack.id
            
        # Add approved questions
        for q in batch.questions:
            if q.draft_status == QuestionDraftStatus.APPROVED:
                await pack_service.add_question(pack_id, {
                    "question_text": q.question_text,
                    "option_a": q.option_a,
                    "option_b": q.option_b,
                    "option_c": q.option_c,
                    "option_d": q.option_d,
                    "correct_option": q.correct_option,
                    "explanation": q.explanation
                })
                
        batch.status = DraftBatchStatus.PUBLISHED
        await self.db.commit()
        return True
