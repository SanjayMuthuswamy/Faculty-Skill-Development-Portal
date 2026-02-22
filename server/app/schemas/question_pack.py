
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel

from app.models.skill import SkillDomain
from app.models.enums import PackStatus, Difficulty
from app.models.question import QuestionOption

# Question Schemas
class QuestionBase(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: QuestionOption
    explanation: Optional[str] = None

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_option: Optional[QuestionOption] = None
    explanation: Optional[str] = None

class Question(QuestionBase):
    id: str
    pack_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Pack Schemas
class QuestionPackBase(BaseModel):
    pack_name: str
    domain: SkillDomain
    topic: Optional[str] = None
    difficulty: Difficulty = Difficulty.BEGINNER
    description: Optional[str] = None
    status: PackStatus = PackStatus.DRAFT

class QuestionPackCreate(QuestionPackBase):
    pass

class QuestionPackUpdate(BaseModel):
    pack_name: Optional[str] = None
    domain: Optional[SkillDomain] = None
    topic: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    description: Optional[str] = None
    status: Optional[PackStatus] = None

class QuestionPack(QuestionPackBase):
    id: str
    created_by_id: str
    created_at: datetime
    published_at: Optional[datetime] = None
    questions: List[Question] = []

    class Config:
        from_attributes = True
