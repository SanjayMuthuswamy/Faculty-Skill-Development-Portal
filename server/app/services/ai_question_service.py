
from typing import List, Optional
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.question_draft import QuestionDraftBatch, QuestionDraft, DraftBatchStatus, QuestionDraftStatus
from app.models.question_pack import QuestionPack
from app.models.question import Question
from app.schemas.question_draft import QuestionDraftBatchCreate, PublishConfig, QuestionDraftUpdate
from app.schemas.question_pack import QuestionPackCreate, QuestionCreate
from app.models.enums import PackStatus
from app.services.question_pack_service import QuestionPackService

from app.services.llm_service import LLMService

class AIQuestionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMService()

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
        
        # Call LLM to generate quiz
        # Map difficulty Beginer/Intermediate/Advanced to Easy/Medium/Hard for LLM if needed
        # But batch_in.difficulty usually matches what the UI sends.
        quiz_data = await self.llm.generate_quiz(
            topic=batch_in.topic,
            difficulty=batch_in.difficulty,
            num_questions=batch_in.count,
            marks=10 # Default marks per question
        )

        if not quiz_data:
            batch.status = DraftBatchStatus.FAILED
            await self.db.commit()
            return batch

        for q_in in quiz_data.quiz:
            # Normalize correct_option to uppercase (A, B, C, or D)
            correct_opt = q_in.correct_answer.upper() if q_in.correct_answer else "A"
            if correct_opt not in ["A", "B", "C", "D"]:
                correct_opt = "A" # Fallback

            q = QuestionDraft(
                id=str(uuid4()),
                batch_id=batch.id,
                question_text=q_in.question,
                option_a=q_in.options.get("A", ""),
                option_b=q_in.options.get("B", ""),
                option_c=q_in.options.get("C", ""),
                option_d=q_in.options.get("D", ""),
                correct_option=correct_opt,
                explanation="AI generated question.",
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
        for field, value in update_in.model_dump(exclude_unset=True).items():
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
            
        # Load approved questions into a list of schema objects immediately to avoid expiration during commits
        question_data_list = [
            QuestionCreate(
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                correct_option=q.correct_option,
                explanation=q.explanation
            )
            for q in batch.questions if q.draft_status == QuestionDraftStatus.APPROVED
        ]
        created_by_id = batch.created_by_id
        topic = batch.topic
        
        pack_service = QuestionPackService(self.db)
        
        # Find or create pack
        pack_id = config.existingPackId
        if not pack_id:
            pack_name = config.packName or f"Generated Pack {topic}"
            # Check if a pack with this name already exists in the domain
            existing = await pack_service.get_pack_by_name(config.domain, pack_name)
            if existing:
                pack_id = existing.id
            else:
                # Ensure difficulty is uppercase matching the enum
                normalized_difficulty = config.difficulty.upper()
                
                # Create new pack
                new_pack = await pack_service.create_pack(QuestionPackCreate(
                    pack_name=pack_name,
                    domain=config.domain,
                    topic=config.topic,
                    difficulty=normalized_difficulty,
                    description=config.description,
                    status=PackStatus.PUBLISHED,  # Immediately publish so it appears in TestBuilder
                ), created_by_id)
                pack_id = new_pack.id
            
        # Add approved questions
        for q_data in question_data_list:
            await pack_service.add_question(pack_id, q_data, commit=False)
                
        batch.status = DraftBatchStatus.PUBLISHED
        await self.db.commit()
        return True
