
import os
from pathlib import Path
from typing import Optional, List
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, attributes
from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.models.enums import UserRole
from app.core.security import get_password_hash
from app.models.faculty_profile import FacultyProfile
from app.models.faculty_skill import FacultySkill, SkillStatus
from app.models.skill import Skill
from app.models.faculty_news_preferences import FacultyNewsPreferences
from app.models.course_enrollment import CourseEnrollment
from app.models.course_attempt import CourseAttempt
from app.models.course import Course
from app.models.course_module import CourseModule
from app.models.lesson_progress import LessonProgress
from app.models.attempt import Attempt
from app.models.attempt_answer import AttemptAnswer
from app.models.performance_analysis import PerformanceAnalysis
from app.models.growth_plan import GrowthPlan
from app.models.growth_week import GrowthWeek
from app.models.week_task import WeekTask
from app.models.enrollment import Enrollment
from app.models.practice_set import PracticeSet, PracticeSetQuestion
from app.models.faculty_query import FacultyQuery
from app.models.discussion import Discussion, DiscussionReply
from app.models.roadmap import Roadmap
from app.models.roadmap_week import RoadmapWeek
from app.models.roadmap_item import RoadmapItem
from app.schemas.faculty import (
    FacultyProfileUpdate,
    FacultyCreateRequest,
    FacultyAccountCreateRequest,
    FacultyAccountUpdateRequest,
)
from app.schemas.skill import FacultySkillCreate, FacultySkillUpdate
from app.schemas.news import NewsPreferencesUpdate

from app.services.llm_service import LLMService


MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_PROFILE_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
PROFILE_IMAGE_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "profile-images"


class FacultyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMService()

    async def get_multi(self, skip: int = 0, limit: int = 100) -> List[FacultyProfile]:
        result = await self.db.execute(
            select(FacultyProfile)
            .offset(skip)
            .limit(limit)
            .options(
                selectinload(FacultyProfile.user),
                selectinload(FacultyProfile.skills).selectinload(FacultySkill.skill),
                selectinload(FacultyProfile.course_enrollments)
                .selectinload(CourseEnrollment.course)
                .selectinload(Course.modules)
                .selectinload(CourseModule.quiz_questions)
            )
        )
        return result.scalars().all()

    async def get_ai_skill_suggestions(self, faculty_id: str):
        """Get AI-powered skill suggestions based on current profile."""
        profile = await self.db.execute(
            select(FacultyProfile)
            .where(FacultyProfile.id == faculty_id)
            .options(selectinload(FacultyProfile.skills).selectinload(FacultySkill.skill))
        )
        p = profile.scalar_one_or_none()
        if not p:
            return None
            
        current_skills = [s.skill.name for s in p.skills]
        return await self.llm.suggest_skills(current_skills, p.department or "General")

    async def get_by_user_id(self, user_id: str) -> Optional[FacultyProfile]:
        result = await self.db.execute(
            select(FacultyProfile)
            .where(FacultyProfile.user_id == user_id)
            .options(
                selectinload(FacultyProfile.user),
                selectinload(FacultyProfile.skills).selectinload(FacultySkill.skill),
                selectinload(FacultyProfile.course_enrollments)
                .selectinload(CourseEnrollment.course)
                .selectinload(Course.modules)
                .selectinload(CourseModule.quiz_questions)
            )
        )
        return result.scalar_one_or_none()

    async def create_profile(self, user_id: str) -> FacultyProfile:
        db_profile = FacultyProfile(user_id=user_id)
        self.db.add(db_profile)
        await self.db.commit()
        await self.db.refresh(db_profile)
        return db_profile

    async def register_faculty(self, faculty_in: FacultyCreateRequest) -> FacultyProfile:
        """Register a new faculty member: Create User, hash password, and create Faculty Profile."""
        normalized_email = faculty_in.email.lower().strip()
        # 1. Check for duplicate email
        result = await self.db.execute(select(User).where(User.email == normalized_email))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            raise ValueError(f"User with email {faculty_in.email} already exists")

        # 2. Create User with ROLE=FACULTY
        new_user = User(
            id=str(uuid4()),
            name=faculty_in.name,
            email=normalized_email,
            password_hash=get_password_hash(faculty_in.password),
            role=UserRole.FACULTY,
            is_active=True
        )
        self.db.add(new_user)
        
        # 3. Create Faculty Profile
        db_profile = FacultyProfile(
            id=str(uuid4()),
            user_id=new_user.id,
            department=faculty_in.department,
            designation=faculty_in.designation,
            experience_years=faculty_in.experience_years
        )
        self.db.add(db_profile)
        
        await self.db.flush() # Ensure IDs are set
        
        # 4. Initialize News Preferences as blank for new users.
        prefs = FacultyNewsPreferences(
            faculty_id=db_profile.id,
            topics=[]
        )
        self.db.add(prefs)
        
        await self.db.commit()

        # Re-fetch with all relationships loaded for proper serialization
        return await self.get_by_user_id(new_user.id)

    async def create_faculty_account(self, faculty_in: FacultyAccountCreateRequest) -> FacultyProfile:
        profile = await self.register_faculty(faculty_in)
        if faculty_in.is_active is False:
            result = await self.db.execute(select(User).where(User.id == profile.user_id))
            user = result.scalar_one()
            user.is_active = False
            await self.db.commit()
            return await self.get_by_user_id(profile.user_id)
        return profile

    def _remove_profile_image_file(self, profile: FacultyProfile) -> None:
        image_url = (profile.profile_image_url or "").strip()
        if not image_url.startswith("/uploads/profile-images/"):
            return
        file_name = image_url.rsplit("/", 1)[-1]
        if not file_name:
            return
        file_path = PROFILE_IMAGE_UPLOAD_DIR / file_name
        if file_path.exists():
            os.unlink(file_path)

    async def get_by_faculty_profile_id(self, faculty_id: str) -> Optional[FacultyProfile]:
        result = await self.db.execute(
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
        return result.scalar_one_or_none()

    async def update_faculty_account(
        self,
        faculty_id: str,
        update_in: FacultyAccountUpdateRequest,
    ) -> Optional[FacultyProfile]:
        profile = await self.get_by_faculty_profile_id(faculty_id)
        if not profile or not profile.user:
            return None

        duplicate = await self.db.execute(
            select(User).where(
                User.email == update_in.email.lower(),
                User.id != profile.user.id,
            )
        )
        if duplicate.scalar_one_or_none():
            raise ValueError(f"User with email {update_in.email} already exists")

        profile.user.name = update_in.name.strip()
        profile.user.email = update_in.email.lower().strip()
        profile.user.is_active = update_in.is_active
        profile.department = update_in.department.strip()
        profile.designation = update_in.designation.strip()
        profile.experience_years = update_in.experience_years

        await self.db.commit()
        return await self.get_by_faculty_profile_id(faculty_id)

    async def reset_faculty_password(self, faculty_id: str, new_password: str) -> Optional[FacultyProfile]:
        profile = await self.get_by_faculty_profile_id(faculty_id)
        if not profile or not profile.user:
            return None

        profile.user.password_hash = get_password_hash(new_password)
        await self.db.commit()
        return await self.get_by_faculty_profile_id(faculty_id)

    async def delete_faculty_account(self, faculty_id: str) -> bool:
        profile = await self.get_by_faculty_profile_id(faculty_id)
        if not profile:
            return False
        user_id = profile.user_id
        profile_image_url = profile.profile_image_url

        attempt_ids = select(Attempt.id).where(Attempt.faculty_id == faculty_id)
        growth_plan_ids = select(GrowthPlan.id).where(GrowthPlan.faculty_id == faculty_id)
        growth_week_ids = select(GrowthWeek.id).where(GrowthWeek.plan_id.in_(growth_plan_ids))
        practice_set_ids = select(PracticeSet.id).where(PracticeSet.faculty_id == faculty_id)
        roadmap_ids = select(Roadmap.id).where(Roadmap.user_id == user_id)
        roadmap_week_ids = select(RoadmapWeek.id).where(RoadmapWeek.roadmap_id.in_(roadmap_ids))
        discussion_ids = select(Discussion.id).where(Discussion.faculty_id == user_id)

        try:
            await self.db.execute(delete(PerformanceAnalysis).where(PerformanceAnalysis.attempt_id.in_(attempt_ids)))
            await self.db.execute(delete(PerformanceAnalysis).where(PerformanceAnalysis.user_id == user_id))
            await self.db.execute(delete(AttemptAnswer).where(AttemptAnswer.attempt_id.in_(attempt_ids)))
            await self.db.execute(delete(Attempt).where(Attempt.faculty_id == faculty_id))

            await self.db.execute(delete(WeekTask).where(WeekTask.week_id.in_(growth_week_ids)))
            await self.db.execute(delete(GrowthWeek).where(GrowthWeek.plan_id.in_(growth_plan_ids)))
            await self.db.execute(delete(GrowthPlan).where(GrowthPlan.faculty_id == faculty_id))

            await self.db.execute(delete(PracticeSetQuestion).where(PracticeSetQuestion.set_id.in_(practice_set_ids)))
            await self.db.execute(delete(PracticeSet).where(PracticeSet.faculty_id == faculty_id))

            await self.db.execute(delete(FacultySkill).where(FacultySkill.faculty_id == faculty_id))
            await self.db.execute(delete(Enrollment).where(Enrollment.faculty_id == faculty_id))
            await self.db.execute(delete(FacultyNewsPreferences).where(FacultyNewsPreferences.faculty_id == faculty_id))

            await self.db.execute(delete(RoadmapItem).where(RoadmapItem.week_id.in_(roadmap_week_ids)))
            await self.db.execute(delete(RoadmapWeek).where(RoadmapWeek.roadmap_id.in_(roadmap_ids)))
            await self.db.execute(delete(Roadmap).where(Roadmap.user_id == user_id))

            await self.db.execute(
                delete(DiscussionReply).where(
                    (DiscussionReply.faculty_id == user_id) |
                    (DiscussionReply.discussion_id.in_(discussion_ids))
                )
            )
            await self.db.execute(delete(Discussion).where(Discussion.faculty_id == user_id))
            await self.db.execute(delete(FacultyQuery).where(FacultyQuery.faculty_id == user_id))
            await self.db.execute(delete(LessonProgress).where(LessonProgress.faculty_id == user_id))
            await self.db.execute(delete(CourseAttempt).where(CourseAttempt.faculty_id == user_id))
            await self.db.execute(delete(CourseEnrollment).where(CourseEnrollment.faculty_id == user_id))

            await self.db.execute(delete(FacultyProfile).where(FacultyProfile.id == faculty_id))
            await self.db.execute(delete(User).where(User.id == user_id))
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            raise

        if profile_image_url:
            self._remove_profile_image_file(profile)
        return True

    async def update_profile(self, user_id: str, profile_in: FacultyProfileUpdate) -> Optional[FacultyProfile]:
        profile = await self.get_by_user_id(user_id)
        if not profile:
            return None
        
        update_data = profile_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
            
        await self.db.commit()
        # Re-fetch with relationships to keep user and skills populated
        return await self.get_by_user_id(user_id)

    async def upload_profile_image(self, user_id: str, file: UploadFile) -> Optional[FacultyProfile]:
        profile = await self.get_by_user_id(user_id)
        if not profile:
            return None

        content_type = (file.content_type or "").lower().strip()
        extension = ALLOWED_PROFILE_IMAGE_TYPES.get(content_type)
        if not extension:
            raise ValueError("Unsupported image type. Use JPG, PNG, WEBP, or GIF.")

        content = await file.read(MAX_PROFILE_IMAGE_SIZE_BYTES + 1)
        if not content:
            raise ValueError("Empty image file.")
        if len(content) > MAX_PROFILE_IMAGE_SIZE_BYTES:
            raise ValueError("Image too large. Maximum size is 5 MB.")

        PROFILE_IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        new_filename = f"{profile.id}-{uuid4().hex}{extension}"
        new_relative_path = f"/uploads/profile-images/{new_filename}"
        new_file_path = PROFILE_IMAGE_UPLOAD_DIR / new_filename
        new_file_path.write_bytes(content)

        # Remove previous image from disk if it belongs to our uploads folder.
        if profile.profile_image_url and profile.profile_image_url.startswith("/uploads/profile-images/"):
            old_file_name = profile.profile_image_url.rsplit("/", 1)[-1]
            old_file_path = PROFILE_IMAGE_UPLOAD_DIR / old_file_name
            if old_file_path.exists():
                old_file_path.unlink(missing_ok=True)

        profile.profile_image_url = new_relative_path
        await self.db.commit()
        return await self.get_by_user_id(user_id)
    
    async def add_skill(self, faculty_id: str, skill_in: FacultySkillCreate) -> FacultySkill:
        # Check if skill exists, else create (race-safe with IntegrityError retry)
        result = await self.db.execute(select(Skill).where(Skill.name == skill_in.skill_name))
        skill = result.scalar_one_or_none()

        if not skill:
            skill = Skill(name=skill_in.skill_name, domain=skill_in.domain)
            self.db.add(skill)
            try:
                await self.db.flush()
            except IntegrityError:
                await self.db.rollback()
                # Another request created it first; re-fetch and continue.
                result = await self.db.execute(select(Skill).where(Skill.name == skill_in.skill_name))
                skill = result.scalar_one_or_none()
                if not skill:
                    raise ValueError("Failed to create or fetch skill")

        # Fast-path duplicate check before insert
        existing_link = await self.db.execute(
            select(FacultySkill).where(
                FacultySkill.faculty_id == faculty_id,
                FacultySkill.skill_id == skill.id,
            )
        )
        if existing_link.scalar_one_or_none():
            raise ValueError("Skill already added for this faculty")

        db_skill = FacultySkill(
            faculty_id=faculty_id,
            skill_id=skill.id,
            level=skill_in.level,
            status=SkillStatus.UNVERIFIED
        )
        self.db.add(db_skill)
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise ValueError("Skill already added for this faculty")

        # Re-fetch with skill relationship loaded so the nested skill data is available
        result = await self.db.execute(
            select(FacultySkill)
            .where(FacultySkill.id == db_skill.id)
            .options(selectinload(FacultySkill.skill))
        )
        return result.scalar_one()
        
    async def verify_skill(self, faculty_skill_id: str, faculty_id: Optional[str] = None) -> bool:
        stmt = select(FacultySkill).where(FacultySkill.id == faculty_skill_id)
        if faculty_id is not None:
            stmt = stmt.where(FacultySkill.faculty_id == faculty_id)
        result = await self.db.execute(stmt)
        f_skill = result.scalar_one_or_none()
        if f_skill:
            f_skill.status = SkillStatus.VERIFIED
            await self.db.commit()
            return True
        return False

    async def update_faculty_skill(
        self,
        faculty_skill_id: str,
        skill_in: FacultySkillUpdate,
        faculty_id: Optional[str] = None,
    ) -> Optional[FacultySkill]:
        stmt = select(FacultySkill).where(FacultySkill.id == faculty_skill_id)
        if faculty_id is not None:
            stmt = stmt.where(FacultySkill.faculty_id == faculty_id)
        result = await self.db.execute(stmt)
        f_skill = result.scalar_one_or_none()
        if not f_skill:
            return None
            
        if skill_in.level is not None:
            f_skill.level = skill_in.level
            
        await self.db.commit()
        await self.db.refresh(f_skill)
        return f_skill

    async def remove_skill(self, faculty_skill_id: str, faculty_id: Optional[str] = None) -> bool:
        stmt = select(FacultySkill).where(FacultySkill.id == faculty_skill_id)
        if faculty_id is not None:
            stmt = stmt.where(FacultySkill.faculty_id == faculty_id)
        result = await self.db.execute(stmt)
        f_skill = result.scalar_one_or_none()
        if f_skill:
            await self.db.delete(f_skill)
            await self.db.commit()
            return True
        return False

    async def get_news_preferences(self, faculty_id: str) -> FacultyNewsPreferences:
        """Get or create news preferences for a faculty profile."""
        result = await self.db.execute(
            select(FacultyNewsPreferences).where(FacultyNewsPreferences.faculty_id == faculty_id)
        )
        prefs = result.scalar_one_or_none()
        
        if not prefs:
            prefs = FacultyNewsPreferences(
                faculty_id=faculty_id,
                topics=[]
            )
            self.db.add(prefs)
            await self.db.commit()
            await self.db.refresh(prefs)
            
        return prefs

    async def update_news_preferences(self, faculty_id: str, prefs_in: NewsPreferencesUpdate) -> FacultyNewsPreferences:
        """Update notification/news topics for a faculty profile."""
        prefs = await self.get_news_preferences(faculty_id)
        
        # Validate: max 10 topics, trim strings, length <= 40
        sanitized_topics = [t.strip()[:40] for t in prefs_in.topics if t.strip()][:10]
        
        prefs.topics = sanitized_topics
        # Explicitly mark as modified for JSON columns
        attributes.flag_modified(prefs, "topics")
        
        await self.db.commit()
        await self.db.refresh(prefs)
        return prefs
