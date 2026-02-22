
from uuid import uuid4

from sqlalchemy import String, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class WeekTask(Base):
    __tablename__ = "week_tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    week_id: Mapped[str] = mapped_column(ForeignKey("growth_weeks.id"), nullable=False)
    
    label: Mapped[str] = mapped_column(String, nullable=False)
    done: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    week: Mapped["GrowthWeek"] = relationship("GrowthWeek", back_populates="tasks")
