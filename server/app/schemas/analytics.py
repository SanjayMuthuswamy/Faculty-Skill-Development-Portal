
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class NewsItem(BaseModel):
    topic: str
    payload: Dict[str, Any]
    fetched_at: datetime

class FacultyAnalytics(BaseModel):
    faculty_id: str
    faculty_name: str
    department: Optional[str] = None
    verified_skills_count: int
    attempts_count: int
    avg_accuracy: float
    active_plan_progress: float

class DepartmentSummary(BaseModel):
    department: str
    faculty_count: int
    avg_accuracy: float
    total_attempts: int
    plan_adoption_rate: float
    verified_skills_rate: float
    total_enrollments: int
