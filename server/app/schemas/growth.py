from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class RoadmapTask(BaseModel):
    id: str
    label: str
    done: bool

class RoadmapWeek(BaseModel):
    week_number: int
    topics: List[str]
    tasks: List[RoadmapTask]
    completed: bool
    # ... other fields as dict for simplicity in JSON for now, or expand

class GrowthPlanBase(BaseModel):
    domain: str
    skill_name: str
    current_level: int = Field(..., ge=1, le=5)
    target_level: int = Field(..., ge=1, le=5)
    weekly_hours: int = 5
    roadmap_weeks: List[dict] # Storing as dict to be flexible with complex JSON
    status: str = "ACTIVE"

class GrowthPlanCreate(GrowthPlanBase):
    pass

class GrowthPlanUpdate(BaseModel):
    status: Optional[str] = None
    progress_percentage: Optional[float] = None
    roadmap_weeks: Optional[List[dict]] = None

class GrowthPlanResponse(GrowthPlanBase):
    id: str
    user_id: str
    progress_percentage: float
    start_date: datetime
    
    model_config = ConfigDict(from_attributes=True)
