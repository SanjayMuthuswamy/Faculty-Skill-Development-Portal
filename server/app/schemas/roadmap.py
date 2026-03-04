
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


# --- Request Schemas ---

class RoadmapGenerateRequest(BaseModel):
    skill: str = Field(..., min_length=2, max_length=60, description="Skill to learn")
    weeks: int = Field(..., ge=1, le=52, description="Number of weeks (1–52)")
    hours_per_week: int = Field(..., ge=1, le=40, description="Hours per week (1–40)")
    current_level: str = Field(..., pattern="^(beginner|intermediate|advanced)$", description="Current skill level")


class RoadmapProgressUpdate(BaseModel):
    week: int = Field(..., ge=1, description="Week number")
    item_type: str = Field(..., pattern="^(goal|practice)$", description="Item type")
    item_index: int = Field(..., ge=0, description="Index of item in the list")
    completed: bool


# --- Response Schemas ---

class RoadmapItemSchema(BaseModel):
    id: str
    item_type: str
    item_index: int
    completed: bool

    class Config:
        from_attributes = True


class ResourceSchema(BaseModel):
    title: str
    url: str


class RoadmapWeekSchema(BaseModel):
    week: int
    goals: List[str] = []
    topics: List[str] = []
    resources: List[ResourceSchema] = []
    practice: List[str] = []
    items: List[RoadmapItemSchema] = []

    class Config:
        from_attributes = True


class RoadmapResponse(BaseModel):
    id: str
    skill: str
    weeks: int
    hours_per_week: int
    current_level: str
    weekly_plan: List[RoadmapWeekSchema] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ErrorResponse(BaseModel):
    errorCode: str
    message: str
    details: dict = {}
