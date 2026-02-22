from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import Difficulty, PackStatus, QuestionOption, AttemptStatus

# --- Question Schemas ---
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

class QuestionResponse(QuestionBase):
    id: str
    pack_id: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- Question Pack Schemas ---
class QuestionPackBase(BaseModel):
    pack_name: str
    domain: str
    topic: Optional[str] = None
    difficulty: Difficulty = Difficulty.MEDIUM
    description: Optional[str] = None
    status: PackStatus = PackStatus.DRAFT

class QuestionPackCreate(QuestionPackBase):
    pass 

class QuestionPackResponse(QuestionPackBase):
    id: str
    created_by_id: str
    created_at: datetime
    published_at: Optional[datetime] = None
    questions: List[QuestionResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

# --- Test Schemas ---
class TestBase(BaseModel):
    title: str
    domain: str
    difficulty: Difficulty = Difficulty.MIXED
    time_limit_minutes: int = 30
    pass_marks: int = 50
    total_questions: int = 0

class TestCreate(TestBase):
    pack_ids: List[str] = []

class TestResponse(TestBase):
    id: str
    created_by_id: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- Test Attempt Schemas ---
class AttemptBase(BaseModel):
    test_id: str
    faculty_id: str

class AttemptCreate(BaseModel):
    test_id: str

class AttemptUpdate(BaseModel):
    status: AttemptStatus

class AttemptAnswerSchema(BaseModel):
    question_id: str
    selected_option: str

class SubmitAttempt(BaseModel):
    answers: List[AttemptAnswerSchema]

class AttemptAnswerResponse(BaseModel):
    question_id: str
    selected_option: str
    is_correct: bool
    
    model_config = ConfigDict(from_attributes=True)

class AttemptResponse(AttemptBase):
    id: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    score: int
    total: int
    accuracy: float
    status: AttemptStatus
    answers: List[AttemptAnswerResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
