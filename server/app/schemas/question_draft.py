
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.question_draft import DraftBatchStatus, QuestionDraftStatus

class QuestionDraftBase(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    explanation: Optional[str] = None

class QuestionDraftCreate(QuestionDraftBase):
    pass

class QuestionDraftUpdate(BaseModel):
    question_text: Optional[str] = None
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_option: Optional[str] = None
    explanation: Optional[str] = None
    draft_status: Optional[QuestionDraftStatus] = None

class QuestionDraft(QuestionDraftBase):
    id: str
    batch_id: str
    draft_status: QuestionDraftStatus

    class Config:
        from_attributes = True

class QuestionDraftBatchBase(BaseModel):
    topic: str
    domain: str
    difficulty: str

class QuestionDraftBatchCreate(QuestionDraftBatchBase):
    prompt: str
    count: int = 5

class QuestionDraftBatch(QuestionDraftBatchBase):
    id: str
    status: DraftBatchStatus
    created_by_id: str
    created_at: datetime
    questions: List[QuestionDraft]

    class Config:
        from_attributes = True

class PublishConfig(BaseModel):
    domain: str
    packName: Optional[str] = None
    topic: str
    difficulty: str
    existingPackId: Optional[str] = None
    description: Optional[str] = None
