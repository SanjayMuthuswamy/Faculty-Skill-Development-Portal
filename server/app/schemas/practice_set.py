
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.skill import SkillDomain

class PracticeSetQuestionBase(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    explanation: Optional[str] = None

class PracticeSetQuestion(PracticeSetQuestionBase):
    id: str
    set_id: str
    
    class Config:
        from_attributes = True

class PracticeSetBase(BaseModel):
    domain: SkillDomain
    difficulty: str
    source: str
    topic: Optional[str] = None

class PracticeSetCreate(PracticeSetBase):
    count: int = 10

class PracticeSetResultSubmit(BaseModel):
    score: int
    accuracy: float

class PracticeSet(PracticeSetBase):
    id: str
    faculty_id: str
    score: Optional[int] = None
    accuracy: Optional[float] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    questions: List[PracticeSetQuestion] = []
    
    class Config:
        from_attributes = True
