
from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4

from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SkillLevel(str):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    short_description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    prerequisites: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list)
    learning_outcomes: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list)
    instructor_name: Mapped[str] = mapped_column(String, nullable=False, default="")
    duration_hours: Mapped[float] = mapped_column(nullable=False, default=1.0)
    estimated_weeks: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    skill_level: Mapped[str] = mapped_column(String, default="beginner")
    tags: Mapped[Optional[List]] = mapped_column(JSON, default=list)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)

    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    modules: Mapped[List["CourseModule"]] = relationship(
        "CourseModule", back_populates="course", cascade="all, delete-orphan",
        order_by="CourseModule.order_index"
    )
    enrollments: Mapped[List["CourseEnrollment"]] = relationship(
        "CourseEnrollment", back_populates="course", cascade="all, delete-orphan"
    )
    assessment_questions: Mapped[List["CourseAssessmentQuestion"]] = relationship(
        "CourseAssessmentQuestion", back_populates="course", cascade="all, delete-orphan"
    )
    attempts: Mapped[List["CourseAttempt"]] = relationship(
        "CourseAttempt", back_populates="course", cascade="all, delete-orphan"
    )
