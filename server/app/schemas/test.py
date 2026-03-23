
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.skill import SkillDomain
from app.models.enums import Difficulty
from app.schemas.question_pack import Question

class TestPackLink(BaseModel):
    pack_id: str

class TestBase(BaseModel):
    title: str
    description: Optional[str] = None  # BUG-3 fix: description was missing from TestCreate payload
    short_description: Optional[str] = None
    instructions: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    domain: SkillDomain
    difficulty: Difficulty = Difficulty.BEGINNER
    pass_marks: int = 50
    time_limit_minutes: int = 30
    is_published: bool = False

class TestCreate(TestBase):
    pack_ids: List[str] = Field(default_factory=list)
    question_ids: List[str] = Field(default_factory=list)

class TestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    instructions: Optional[str] = None
    tags: Optional[List[str]] = None
    domain: Optional[SkillDomain] = None
    difficulty: Optional[Difficulty] = None
    pass_marks: Optional[int] = None
    time_limit_minutes: Optional[int] = None
    pack_ids: Optional[List[str]] = None
    question_ids: Optional[List[str]] = None
    is_published: Optional[bool] = None

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


class TestBulkCreateRequest(BaseModel):
    tests: List[TestCreate] = Field(default_factory=list)
