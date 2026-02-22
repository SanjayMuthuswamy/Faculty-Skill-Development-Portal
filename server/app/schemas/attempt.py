
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel

from app.models.attempt import AttemptStatus

class AttemptAnswerBase(BaseModel):
    question_id: str
    selected_option: str

class AttemptAnswerCreate(AttemptAnswerBase):
    pass

class AttemptAnswer(AttemptAnswerBase):
    id: str
    attempt_id: str
    is_correct: bool = False

    class Config:
        from_attributes = True

class AttemptBase(BaseModel):
    pass

class AttemptCreate(BaseModel):
    test_id: str

class AttemptUpdate(BaseModel):
    status: AttemptStatus

class BulkSubmitAttempt(BaseModel):
    answers: List[AttemptAnswerBase]

class Attempt(AttemptBase):
    id: str
    test_id: str
    faculty_id: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    score: int
    total: int
    accuracy: float
    status: AttemptStatus
    answers: List[AttemptAnswer] = []

    class Config:
        from_attributes = True
