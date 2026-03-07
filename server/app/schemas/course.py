
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


# ── Module Quiz ─────────────────────────────────────────────────────────────

class ModuleQuizCreate(BaseModel):
    question_text: str
    options: Dict[str, str]   # {"A": "...", "B": "...", "C": "...", "D": "..."}
    correct_answer: str
    explanation: str = ""

class ModuleQuizOut(BaseModel):
    id: str
    module_id: str
    question_text: str
    options: Dict[str, str]
    correct_answer: str
    explanation: str

    class Config:
        from_attributes = True


# ── Course Module ────────────────────────────────────────────────────────────

class CourseModuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: int = 0
    video_url: Optional[str] = None
    video_duration_seconds: int = 0
    notes_url: Optional[str] = None
    key_takeaways: List[str] = []

class CourseModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    video_url: Optional[str] = None
    video_duration_seconds: Optional[int] = None
    notes_url: Optional[str] = None
    key_takeaways: Optional[List[str]] = None

class CourseModuleOut(BaseModel):
    id: str
    course_id: str
    title: str
    description: Optional[str]
    order_index: int
    video_url: Optional[str]
    video_duration_seconds: int
    notes_url: Optional[str]
    key_takeaways: List[str]
    quiz_questions: List[ModuleQuizOut] = []

    class Config:
        from_attributes = True


# ── Course ───────────────────────────────────────────────────────────────────

class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    instructor_name: str = ""
    duration_hours: float = 1.0
    skill_level: str = "beginner"
    tags: List[str] = []
    thumbnail_url: Optional[str] = None
    is_published: bool = False

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    instructor_name: Optional[str] = None
    duration_hours: Optional[float] = None
    skill_level: Optional[str] = None
    tags: Optional[List[str]] = None
    thumbnail_url: Optional[str] = None
    is_published: Optional[bool] = None

class CourseOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    instructor_name: str
    duration_hours: float
    skill_level: str
    tags: List[str]
    thumbnail_url: Optional[str]
    is_published: bool
    created_at: datetime
    modules: List[CourseModuleOut] = []

    class Config:
        from_attributes = True

class CourseListOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    instructor_name: str
    duration_hours: float
    skill_level: str
    tags: List[str]
    thumbnail_url: Optional[str]
    is_published: bool
    created_at: datetime
    module_count: int = 0

    class Config:
        from_attributes = True


# ── Enrollment ───────────────────────────────────────────────────────────────

class CourseEnrollmentOut(BaseModel):
    id: str
    faculty_id: str
    course_id: str
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    progress: int = 0
    certificate_issued: bool = False
    course: Optional[CourseOut] = None

    class Config:
        from_attributes = True


# ── Lesson Progress ──────────────────────────────────────────────────────────

class LessonProgressUpdate(BaseModel):
    watched_seconds: int = 0
    completed: bool = False

class QuizSubmit(BaseModel):
    answers: Dict[str, str]   # {question_id: "A"/"B"/"C"/"D"}

class LessonProgressOut(BaseModel):
    id: str
    faculty_id: str
    module_id: str
    watched_seconds: int
    completed: bool
    quiz_score: Optional[float]
    quiz_passed: bool

    class Config:
        from_attributes = True


# ── Assessment ───────────────────────────────────────────────────────────────

class AssessmentQuestionCreate(BaseModel):
    question_text: str
    options: Dict[str, str]
    correct_answer: str
    explanation: str = ""

class AssessmentQuestionOut(BaseModel):
    id: str
    course_id: str
    question_text: str
    options: Dict[str, str]
    # correct_answer intentionally omitted for faculty-facing view

    class Config:
        from_attributes = True

class AssessmentSubmit(BaseModel):
    answers: Dict[str, str]   # {question_id: "A"/"B"/"C"/"D"}
    time_taken_seconds: int = 0

class CourseAttemptOut(BaseModel):
    id: str
    faculty_id: str
    course_id: str
    score: float
    total_questions: int
    correct_answers: int
    passed: bool
    ai_feedback: Optional[Dict[str, Any]]
    submitted_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Analytics ────────────────────────────────────────────────────────────────

class CourseAnalyticsOut(BaseModel):
    course_id: str
    course_title: str
    total_enrolled: int
    total_completed: int
    completion_rate: float
    average_score: float
