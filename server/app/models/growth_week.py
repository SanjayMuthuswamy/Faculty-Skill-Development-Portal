
from datetime import datetime
from uuid import uuid4

from sqlalchemy import String, Integer, ForeignKey, DateTime, Float, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class GrowthWeek(Base):
    __tablename__ = "growth_weeks"
    __table_args__ = (
        UniqueConstraint('plan_id', 'week_number', name='uq_plan_week'),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    plan_id: Mapped[str] = mapped_column(ForeignKey("growth_plans.id"), nullable=False)
    
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    
    required_practice_count: Mapped[int] = mapped_column(Integer, default=0)
    required_min_avg_score: Mapped[float] = mapped_column(Float, default=0.0)
    
    completed_practice_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_score_for_week: Mapped[float] = mapped_column(Float, default=0.0)
    
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    plan: Mapped["GrowthPlan"] = relationship("GrowthPlan", back_populates="weeks")
    tasks: Mapped[list["WeekTask"]] = relationship("WeekTask", back_populates="week", cascade="all, delete-orphan")
