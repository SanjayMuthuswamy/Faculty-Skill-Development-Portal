
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import String, Boolean, ForeignKey, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    faculty_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    certificate_issued: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    course: Mapped["Course"] = relationship("Course", back_populates="enrollments")
    faculty_user: Mapped["User"] = relationship("User")
