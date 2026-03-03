
from typing import Optional, List
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, attributes

from app.models.user import User
from app.models.enums import UserRole
from app.core.security import get_password_hash
from app.models.faculty_profile import FacultyProfile
from app.models.faculty_skill import FacultySkill, SkillStatus
from app.models.skill import Skill
from app.models.faculty_news_preferences import FacultyNewsPreferences
from app.schemas.faculty import FacultyProfileUpdate, FacultyCreateRequest
from app.schemas.skill import FacultySkillCreate, FacultySkillUpdate
from app.schemas.news import NewsPreferencesUpdate

from app.services.llm_service import LLMService

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
                selectinload(FacultyProfile.skills).selectinload(FacultySkill.skill)
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
                selectinload(FacultyProfile.skills).selectinload(FacultySkill.skill)
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
        # 1. Check for duplicate email
        result = await self.db.execute(select(User).where(User.email == faculty_in.email))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            raise ValueError(f"User with email {faculty_in.email} already exists")

        # 2. Create User with ROLE=FACULTY
        new_user = User(
            id=str(uuid4()),
            name=faculty_in.name,
            email=faculty_in.email,
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
        
        # 4. Initialize News Preferences
        prefs = FacultyNewsPreferences(
            faculty_id=db_profile.id,
            topics=["AI", "Cloud Computing"]
        )
        self.db.add(prefs)
        
        await self.db.commit()

        # Re-fetch with all relationships loaded for proper serialization
        return await self.get_by_user_id(new_user.id)

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
    
    async def add_skill(self, faculty_id: str, skill_in: FacultySkillCreate) -> FacultySkill:
        # Check if skill exists, else create
        result = await self.db.execute(select(Skill).where(Skill.name == skill_in.skill_name))
        skill = result.scalar_one_or_none()
        
        if not skill:
            skill = Skill(name=skill_in.skill_name, domain=skill_in.domain)
            self.db.add(skill)
            await self.db.commit()
            await self.db.refresh(skill)
            
        # Create link
        db_skill = FacultySkill(
            faculty_id=faculty_id,
            skill_id=skill.id,
            level=skill_in.level,
            status=SkillStatus.UNVERIFIED
        )
        self.db.add(db_skill)
        await self.db.commit()

        # Re-fetch with skill relationship loaded so the nested skill data is available
        result = await self.db.execute(
            select(FacultySkill)
            .where(FacultySkill.id == db_skill.id)
            .options(selectinload(FacultySkill.skill))
        )
        return result.scalar_one()
        
    async def verify_skill(self, faculty_skill_id: str) -> bool:
        result = await self.db.execute(select(FacultySkill).where(FacultySkill.id == faculty_skill_id))
        f_skill = result.scalar_one_or_none()
        if f_skill:
            f_skill.status = SkillStatus.VERIFIED
            await self.db.commit()
            return True
        return False

    async def update_faculty_skill(self, faculty_skill_id: str, skill_in: FacultySkillUpdate) -> Optional[FacultySkill]:
        result = await self.db.execute(select(FacultySkill).where(FacultySkill.id == faculty_skill_id))
        f_skill = result.scalar_one_or_none()
        if not f_skill:
            return None
            
        if skill_in.level is not None:
            f_skill.level = skill_in.level
            
        await self.db.commit()
        await self.db.refresh(f_skill)
        return f_skill

    async def remove_skill(self, faculty_skill_id: str) -> bool:
        result = await self.db.execute(select(FacultySkill).where(FacultySkill.id == faculty_skill_id))
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
                topics=["AI", "Cloud Computing"] # Default topics
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
