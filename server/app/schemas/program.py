
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel

from app.models.skill import SkillDomain
from app.models.program import ProgramStatus
from app.models.enrollment import EnrollmentStatus

# Enrollment Schemas
class EnrollmentBase(BaseModel):
    status: EnrollmentStatus = EnrollmentStatus.ENROLLED

class EnrollmentCreate(BaseModel):
    program_id: str

class EnrollmentUpdate(BaseModel):
    status: EnrollmentStatus

class Enrollment(EnrollmentBase):
    id: str
    program_id: str
    faculty_id: str
    enrolled_at: datetime
    
    class Config:
        from_attributes = True

# Program Schemas
class ProgramBase(BaseModel):
    title: str
    description: Optional[str] = None
    domain: SkillDomain
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration: Optional[str] = None
    seats: int = 30
    mode: str = "Online"
    topics: List[str] = []
    benefits: List[str] = []
    status: ProgramStatus = ProgramStatus.DRAFT

class ProgramCreate(ProgramBase):
    pass

class ProgramUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[SkillDomain] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration: Optional[str] = None
    seats: Optional[int] = None
    mode: Optional[str] = None
    topics: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
    status: Optional[ProgramStatus] = None

class Program(ProgramBase):
    id: str
    created_by_id: str
    created_at: datetime
    enrollments: List[Enrollment] = []

    class Config:
        from_attributes = True
