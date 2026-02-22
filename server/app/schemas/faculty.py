
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

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
    created_at: datetime

    class Config:
        from_attributes = True

class FacultyProfile(FacultyProfileInDBBase):
    pass
