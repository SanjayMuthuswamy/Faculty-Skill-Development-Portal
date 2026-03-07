
from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4

from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CourseModule(Base):
    __tablename__ = "course_modules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    video_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    video_duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    notes_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    key_takeaways: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    course: Mapped["Course"] = relationship("Course", back_populates="modules")
    quiz_questions: Mapped[List["ModuleQuiz"]] = relationship(
        "ModuleQuiz", back_populates="module", cascade="all, delete-orphan"
    )
    lesson_progresses: Mapped[List["LessonProgress"]] = relationship(
        "LessonProgress", back_populates="module", cascade="all, delete-orphan"
    )
