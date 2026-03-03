
from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4

from sqlalchemy import String, Integer, ForeignKey, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.skill import SkillDomain

class GrowthPlanStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    RESET = "RESET"

class GrowthPlan(Base):
    __tablename__ = "growth_plans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    faculty_id: Mapped[str] = mapped_column(ForeignKey("faculty_profiles.id"), nullable=False)
    
    domain: Mapped[SkillDomain] = mapped_column(String, nullable=False)
    target_skill: Mapped[str] = mapped_column(String, nullable=False)
    current_level: Mapped[int] = mapped_column(Integer, default=1)
    target_level: Mapped[int] = mapped_column(Integer, default=5)
    weekly_hours: Mapped[int] = mapped_column(Integer, default=5)
    
    status: Mapped[GrowthPlanStatus] = mapped_column(String, default=GrowthPlanStatus.ACTIVE)
    progress_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reset_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    faculty: Mapped["FacultyProfile"] = relationship("FacultyProfile", back_populates="growth_plans")
    weeks: Mapped[list["GrowthWeek"]] = relationship("GrowthWeek", back_populates="plan", cascade="all, delete-orphan", order_by="GrowthWeek.week_number")
