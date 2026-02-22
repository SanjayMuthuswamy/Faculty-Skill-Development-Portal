
from typing import Optional, List
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.faculty_profile import FacultyProfile
from app.models.faculty_skill import FacultySkill, SkillStatus
from app.models.skill import Skill
from app.models.faculty_news_preferences import FacultyNewsPreferences
from app.schemas.faculty import FacultyProfileUpdate
from app.schemas.skill import FacultySkillCreate, FacultySkillUpdate
from app.schemas.news import NewsPreferencesUpdate

class FacultyService:
    def __init__(self, db: AsyncSession):
        self.db = db

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

    async def update_profile(self, user_id: str, profile_in: FacultyProfileUpdate) -> Optional[FacultyProfile]:
        profile = await self.get_by_user_id(user_id)
        if not profile:
            return None
        
        update_data = profile_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
            
        await self.db.commit()
        await self.db.refresh(profile)
        return profile
    
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
        await self.db.refresh(db_skill)
        return db_skill
        
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
        await self.db.commit()
        await self.db.refresh(prefs)
        return prefs
