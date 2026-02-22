
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel

from app.models.skill import SkillDomain
from app.models.faculty_skill import SkillStatus

# Skill Schemas
class SkillBase(BaseModel):
    name: str
    domain: SkillDomain

class SkillCreate(SkillBase):
    pass

class Skill(SkillBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Faculty Skill Schemas
class FacultySkillBase(BaseModel):
    level: int = 1
    status: SkillStatus = SkillStatus.UNVERIFIED

class FacultySkillCreate(BaseModel):
    skill_name: str # Allow creating link by name
    domain: SkillDomain
    level: int = 1

class FacultySkillUpdate(BaseModel):
    level: Optional[int] = None
    status: Optional[SkillStatus] = None

class FacultySkill(FacultySkillBase):
    id: str
    faculty_id: str
    skill_id: str
    skill: Skill # Nested skill details
    updated_at: datetime

    class Config:
        from_attributes = True
