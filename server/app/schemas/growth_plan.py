
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel

from app.models.skill import SkillDomain
from app.models.growth_plan import GrowthPlanStatus

class WeekTaskBase(BaseModel):
    label: str
    done: bool = False

class WeekTaskUpdate(BaseModel):
    done: bool

class WeekTask(WeekTaskBase):
    id: str
    week_id: str
    
    class Config:
        from_attributes = True

class GrowthWeekBase(BaseModel):
    week_number: int
    title: str
    required_practice_count: int
    required_min_avg_score: float
    completed_practice_count: int = 0
    avg_score_for_week: float = 0.0
    completed: bool = False
    completed_at: Optional[datetime] = None

class GrowthWeek(GrowthWeekBase):
    id: str
    plan_id: str
    tasks: List[WeekTask] = []
    
    class Config:
        from_attributes = True

class GrowthPlanBase(BaseModel):
    domain: SkillDomain
    target_skill: str
    current_level: int
    target_level: int
    weekly_hours: int

class GrowthPlanCreate(GrowthPlanBase):
    pass

class GrowthPlan(GrowthPlanBase):
    id: str
    faculty_id: str
    status: GrowthPlanStatus
    progress_percentage: float
    created_at: datetime
    reset_at: Optional[datetime] = None
    weeks: List[GrowthWeek] = []

    class Config:
        from_attributes = True
