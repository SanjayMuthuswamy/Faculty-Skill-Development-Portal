from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.crud.skill import skill as crud_skill
from app.crud.skill import faculty_skill as crud_faculty_skill
from app.schemas.skill import SkillCreate, SkillResponse, FacultySkillCreate, FacultySkillResponse, FacultySkillUpdate
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[SkillResponse])
async def read_skills(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve skills.
    """
    skills = await crud_skill.get_multi(db, skip=skip, limit=limit)
    return skills

@router.post("/", response_model=SkillResponse)
async def create_skill(
    *,
    db: AsyncSession = Depends(deps.get_db),
    skill_in: SkillCreate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new skill.
    """
    skill = await crud_skill.get_by_name(db, name=skill_in.name)
    if skill:
        raise HTTPException(status_code=400, detail="Skill already exists")
    skill = await crud_skill.create(db, obj_in=skill_in)
    return skill

# --- Faculty Skills ---

@router.get("/faculty/me", response_model=List[FacultySkillResponse])
async def read_my_skills(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user's skills.
    """
    skills = await crud_faculty_skill.get_by_user(db, user_id=current_user.id)
    return skills

@router.post("/faculty", response_model=FacultySkillResponse)
async def add_faculty_skill(
    *,
    db: AsyncSession = Depends(deps.get_db),
    skill_in: FacultySkillCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Add a skill to faculty profile.
    """
    existing = await crud_faculty_skill.get_by_user_and_skill(db, user_id=current_user.id, skill_id=skill_in.skill_id)
    if existing:
        raise HTTPException(status_code=400, detail="Skill already added to profile")
        
    faculty_skill = await crud_faculty_skill.create(db, obj_in=skill_in, user_id=current_user.id)
    return faculty_skill
