from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.base import CRUDBase
from app.models.skill import Skill, FacultySkill
from app.schemas.skill import SkillCreate, SkillBase, FacultySkillCreate, FacultySkillUpdate
from app.models.enums import SkillCategory

class CRUDSkill(CRUDBase[Skill, SkillCreate, SkillBase]):
    async def get_by_name(self, db: AsyncSession, *, name: str) -> Optional[Skill]:
        result = await db.execute(select(Skill).filter(Skill.name == name))
        return result.scalars().first()

    async def get_by_category(self, db: AsyncSession, *, category: SkillCategory) -> List[Skill]:
        result = await db.execute(select(Skill).filter(Skill.category == category))
        return result.scalars().all()
    
    async def create(self, db: AsyncSession, *, obj_in: SkillCreate) -> Skill:
        db_obj = Skill(
            id=str(uuid.uuid4()),
            name=obj_in.name,
            category=obj_in.category,
            description=obj_in.description
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

skill = CRUDSkill(Skill)

class CRUDFacultySkill(CRUDBase[FacultySkill, FacultySkillCreate, FacultySkillUpdate]):
    async def get_by_user_and_skill(self, db: AsyncSession, *, user_id: str, skill_id: str) -> Optional[FacultySkill]:
        result = await db.execute(
            select(FacultySkill).filter(FacultySkill.user_id == user_id, FacultySkill.skill_id == skill_id)
        )
        return result.scalars().first()

    async def get_by_user(self, db: AsyncSession, *, user_id: str) -> List[FacultySkill]:
        result = await db.execute(select(FacultySkill).filter(FacultySkill.user_id == user_id))
        return result.scalars().all()
        
    async def create(self, db: AsyncSession, *, obj_in: FacultySkillCreate, user_id: str) -> FacultySkill:
        db_obj = FacultySkill(
            id=str(uuid.uuid4()),
            user_id=user_id,
            skill_id=obj_in.skill_id,
            level=obj_in.level,
            status=obj_in.status,
            verification_data=obj_in.verification_data
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

faculty_skill = CRUDFacultySkill(FacultySkill)
