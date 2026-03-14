import logging
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.api.v1.deps import get_current_user, get_session, require_role
from app.models.user import User, UserRole
from app.models.faculty_profile import FacultyProfile
from app.models.faculty_skill import FacultySkill
from app.models.course_enrollment import CourseEnrollment
from app.models.course import Course
from app.models.course_module import CourseModule
from app.schemas.faculty import FacultyProfile as FacultySchema, FacultyProfileUpdate, FacultyCreateRequest, SkillSuggestions
from app.schemas.skill import FacultySkill as FacultySkillSchema, FacultySkillCreate, FacultySkillUpdate
from app.schemas.news import NewsPreferences, NewsPreferencesUpdate, PersonalizedNewsResponse
from app.core.pagination import get_pagination_bounds
from app.services.faculty_service import FacultyService
from app.services.news_service import NewsService

router = APIRouter(tags=["faculty"])
logger = logging.getLogger(__name__)


def require_faculty_user(current_user: User = Depends(get_current_user)) -> User:
    """Restrict self-service faculty endpoints to faculty accounts only."""
    if current_user.role != UserRole.FACULTY:
        raise HTTPException(status_code=403, detail="Only faculty users can access this endpoint")
    if not current_user.faculty_profile:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
    return current_user

@router.post("/register-faculty", response_model=FacultySchema)
async def register_new_faculty(
    faculty_in: FacultyCreateRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    """Admin only: Register a new faculty member with user record and profile."""
    service = FacultyService(db)
    try:
        return await service.register_faculty(faculty_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[FacultySchema])
async def list_faculty_profiles(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = FacultyService(db)
    result = await service.get_multi(skip=skip, limit=limit)
    logger.debug(f"Retrieved {len(result)} faculty profiles")
    return result


@router.get("/paged")
async def list_faculty_profiles_paged(
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    department: Optional[str] = None,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    offset, normalized_page, normalized_page_size = get_pagination_bounds(page=page, page_size=page_size)

    base_query = select(FacultyProfile).join(User, FacultyProfile.user_id == User.id)

    if search:
        search_term = f"%{search.strip()}%"
        if search_term != "%%":
            base_query = base_query.where(
                or_(
                    func.lower(User.name).like(func.lower(search_term)),
                    func.lower(User.email).like(func.lower(search_term)),
                    func.lower(FacultyProfile.department).like(func.lower(search_term)),
                    func.lower(FacultyProfile.designation).like(func.lower(search_term)),
                )
            )

    if department:
        base_query = base_query.where(FacultyProfile.department == department)

    total_stmt = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(total_stmt)).scalar_one()

    result = await db.execute(
        base_query
        .order_by(FacultyProfile.created_at.desc())
        .offset(offset)
        .limit(normalized_page_size)
        .options(
            selectinload(FacultyProfile.user),
            selectinload(FacultyProfile.skills).selectinload(FacultySkill.skill),
            selectinload(FacultyProfile.course_enrollments)
            .selectinload(CourseEnrollment.course)
            .selectinload(Course.modules)
            .selectinload(CourseModule.quiz_questions)
        )
    )
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": normalized_page,
        "page_size": normalized_page_size,
        "total_pages": ceil(total / normalized_page_size) if total else 1,
    }

@router.get("/me", response_model=FacultySchema)
async def get_my_profile(
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    service = FacultyService(db)
    profile = await service.get_by_user_id(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
    return profile

@router.get("/me/skill-suggestions", response_model=SkillSuggestions)
async def get_my_skill_suggestions(
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    """Get AI-powered skill suggestions based on current profile."""
    service = FacultyService(db)
    suggestions = await service.get_ai_skill_suggestions(current_user.faculty_profile.id)
    if not suggestions:
        raise HTTPException(status_code=500, detail="Failed to generate AI suggestions")
    return suggestions

@router.patch("/me", response_model=FacultySchema)
async def update_my_profile(
    profile_in: FacultyProfileUpdate,
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    service = FacultyService(db)
    profile = await service.update_profile(current_user.id, profile_in)
    if not profile:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
    return profile

@router.post("/me/skills", response_model=FacultySkillSchema)
async def add_skill_to_profile(
    skill_in: FacultySkillCreate,
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    service = FacultyService(db)
    try:
        return await service.add_skill(current_user.faculty_profile.id, skill_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/me/skills/{skill_id}", response_model=FacultySkillSchema)
async def update_my_skill(
    skill_id: str,
    skill_in: FacultySkillUpdate,
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    """Update proficiency level of a faculty skill."""
    service = FacultyService(db)
    updated = await service.update_faculty_skill(skill_id, skill_in, current_user.faculty_profile.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Skill not found")
    return updated

@router.delete("/me/skills/{skill_id}")
async def remove_my_skill(
    skill_id: str,
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    """Remove a skill from the current faculty profile."""
    service = FacultyService(db)
    success = await service.remove_skill(skill_id, current_user.faculty_profile.id)
    if not success:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"status": "success"}

@router.get("/me/news-preferences", response_model=NewsPreferences)
async def get_my_news_preferences(
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    """Get professional news/trends topic preferences for the current faculty."""
    service = FacultyService(db)
    return await service.get_news_preferences(current_user.faculty_profile.id)

@router.put("/me/news-preferences", response_model=NewsPreferences)
async def update_my_news_preferences(
    prefs_in: NewsPreferencesUpdate,
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    """Update professional news/trends topic preferences for the current faculty."""
    service = FacultyService(db)
    return await service.update_news_preferences(current_user.faculty_profile.id, prefs_in)

@router.get("/me/news", response_model=PersonalizedNewsResponse)
async def get_my_news(
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    """Get an aggregated personalized feed of professional trends based on preferences."""
    f_service = FacultyService(db)
    prefs = await f_service.get_news_preferences(current_user.faculty_profile.id)
    
    n_service = NewsService(db)
    return await n_service.get_personalized_news(current_user.faculty_profile.id, prefs.topics)

@router.post("/{faculty_id}/verify-skill/{skill_id}")
async def verify_faculty_skill(
    faculty_id: str,
    skill_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = FacultyService(db)
    success = await service.verify_skill(skill_id, faculty_id)
    if not success:
        raise HTTPException(status_code=404, detail="Faculty skill not found")
    return {"status": "success"}
    
@router.get("/{faculty_id}", response_model=FacultySchema)
async def get_faculty_profile(
    faculty_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    result = await db.execute(
        select(FacultyProfile)
        .where(FacultyProfile.id == faculty_id)
        .options(
            selectinload(FacultyProfile.user),
            selectinload(FacultyProfile.skills).selectinload(FacultySkill.skill),
            selectinload(FacultyProfile.course_enrollments)
            .selectinload(CourseEnrollment.course)
            .selectinload(Course.modules)
            .selectinload(CourseModule.quiz_questions)
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
    return profile
