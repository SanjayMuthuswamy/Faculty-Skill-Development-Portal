
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

from app.schemas.skill import FacultySkill as FacultySkillSchema


# Minimal user info embedded in faculty profile responses
class UserBase(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class FacultyProfileBase(BaseModel):
    department: Optional[str] = None
    designation: Optional[str] = None
    experience_years: Optional[int] = 0

class FacultyProfileCreate(FacultyProfileBase):
    user_id: str

class FacultyProfileUpdate(FacultyProfileBase):
    pass

class FacultyProfileInDBBase(FacultyProfileBase):
    id: str
    user_id: str
    profile_image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

from app.schemas.course import CourseEnrollmentOut

class FacultyProfile(FacultyProfileInDBBase):
    user: Optional[UserBase] = None
    skills: List[FacultySkillSchema] = []
    course_enrollments: List[CourseEnrollmentOut] = []

class FacultyCreateRequest(BaseModel):
    name: str
    email: str
    department: str
    designation: str
    experience_years: int
    password: str  # Admin provided temporary password

class SkillSuggestions(BaseModel):
    suggested_skills: List[str]
    reasoning: str
