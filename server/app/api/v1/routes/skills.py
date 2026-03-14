from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.api.v1.deps import get_current_user, get_session, require_role
from app.models.user import User, UserRole
from app.models.skill import Skill
from app.schemas.skill import Skill as SkillSchema, SkillCreate

router = APIRouter(tags=["skills"])

@router.get("/", response_model=List[SkillSchema])
async def list_skills(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    result = await db.execute(select(Skill).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/", response_model=SkillSchema)
async def create_skill(
    skill_in: SkillCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    # Check if skill exists
    result = await db.execute(select(Skill).where(Skill.name == skill_in.name))
    if result.scalar_one_or_none():
         raise HTTPException(status_code=400, detail="Skill already exists")
         
    db_skill = Skill(**skill_in.model_dump())
    db.add(db_skill)
    await db.commit()
    await db.refresh(db_skill)
    return db_skill
