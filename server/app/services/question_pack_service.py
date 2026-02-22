
from typing import Optional, List
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.question_pack import QuestionPack, PackStatus
from app.models.question import Question
from app.schemas.question_pack import QuestionPackCreate, QuestionPackUpdate, QuestionCreate

class QuestionPackService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, skip: int = 0, limit: int = 100, filters: dict = {}) -> List[QuestionPack]:
        query = select(QuestionPack).offset(skip).limit(limit)
        
        if filters.get("domain"):
            query = query.where(QuestionPack.domain == filters["domain"])
        if filters.get("status"):
            query = query.where(QuestionPack.status == filters["status"])
            
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_pack(self, pack_id: str) -> Optional[QuestionPack]:
        query = select(QuestionPack).where(QuestionPack.id == pack_id).options(selectinload(QuestionPack.questions))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_pack(self, pack_in: QuestionPackCreate, user_id: str) -> QuestionPack:
        db_pack = QuestionPack(
            id=str(uuid4()),
            created_by_id=user_id,
            **pack_in.model_dump()
        )
        self.db.add(db_pack)
        await self.db.commit()
        await self.db.refresh(db_pack)
        return db_pack
    
    async def add_question(self, pack_id: str, question_in: QuestionCreate) -> Question:
        db_question = Question(
            id=str(uuid4()),
            pack_id=pack_id,
            **question_in.model_dump()
        )
        self.db.add(db_question)
        await self.db.commit()
        await self.db.refresh(db_question)
        return db_question

    async def update_pack(self, pack_id: str, pack_in: dict) -> Optional[QuestionPack]:
        result = await self.db.execute(select(QuestionPack).where(QuestionPack.id == pack_id))
        db_pack = result.scalar_one_or_none()
        if not db_pack:
            return None
        
        for field, value in pack_in.items():
            setattr(db_pack, field, value)
        
        await self.db.commit()
        await self.db.refresh(db_pack)
        return db_pack

    async def delete_pack(self, pack_id: str) -> bool:
        result = await self.db.execute(select(QuestionPack).where(QuestionPack.id == pack_id))
        db_pack = result.scalar_one_or_none()
        if not db_pack:
            return False
        
        await self.db.delete(db_pack)
        await self.db.commit()
        return True

    async def get_all_questions(self, skip: int = 0, limit: int = 100) -> List[Question]:
        result = await self.db.execute(select(Question).offset(skip).limit(limit))
        return result.scalars().all()

    async def update_question(self, question_id: str, question_in: dict) -> Optional[Question]:
        result = await self.db.execute(select(Question).where(Question.id == question_id))
        db_question = result.scalar_one_or_none()
        if not db_question:
            return None
        
        for field, value in question_in.items():
            setattr(db_question, field, value)
        
        await self.db.commit()
        await self.db.refresh(db_question)
        return db_question

    async def delete_question(self, question_id: str) -> bool:
        result = await self.db.execute(select(Question).where(Question.id == question_id))
        db_question = result.scalar_one_or_none()
        if not db_question:
            return False
        
        await self.db.delete(db_question)
        await self.db.commit()
        return True
