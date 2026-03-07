
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import String, Boolean, Integer, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CourseAttempt(Base):
    __tablename__ = "course_attempts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    faculty_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0.0)          # percentage
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    correct_answers: Mapped[int] = mapped_column(Integer, default=0)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_feedback: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # {weak_areas, suggestions}
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    course: Mapped["Course"] = relationship("Course", back_populates="attempts")
