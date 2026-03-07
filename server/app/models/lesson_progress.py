
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import String, Boolean, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class LessonProgress(Base):
    __tablename__ = "lesson_progresses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    faculty_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    module_id: Mapped[str] = mapped_column(ForeignKey("course_modules.id"), nullable=False)
    watched_seconds: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    quiz_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    quiz_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    module: Mapped["CourseModule"] = relationship("CourseModule", back_populates="lesson_progresses")
