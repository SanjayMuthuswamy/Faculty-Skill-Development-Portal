
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel

from app.models.skill import SkillDomain
from app.models.enums import Difficulty
from app.schemas.question_pack import Question

class TestPackLink(BaseModel):
    pack_id: str

class TestBase(BaseModel):
    title: str
    description: Optional[str] = None  # BUG-3 fix: description was missing from TestCreate payload
    domain: SkillDomain
    difficulty: Difficulty = Difficulty.BEGINNER
    pass_marks: int = 50
    time_limit_minutes: int = 30

class TestCreate(TestBase):
    pack_ids: List[str]
    question_ids: List[str] = []

class TestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[SkillDomain] = None
    difficulty: Optional[Difficulty] = None
    pass_marks: Optional[int] = None
    time_limit_minutes: Optional[int] = None
    pack_ids: Optional[List[str]] = None
    question_ids: Optional[List[str]] = None

class Test(TestBase):
    id: str
    total_questions: int
    created_by_id: str
    created_at: datetime
    questions: List[Question] = []
    pack_ids: List[str] = []
    question_ids: List[str] = []

    class Config:
        from_attributes = True
