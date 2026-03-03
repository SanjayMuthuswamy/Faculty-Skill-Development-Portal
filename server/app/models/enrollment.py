
from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4

from sqlalchemy import String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

from app.models.enums import EnrollmentStatus

class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint('program_id', 'faculty_id', name='uq_program_faculty'),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    program_id: Mapped[str] = mapped_column(ForeignKey("programs.id"), nullable=False)
    faculty_id: Mapped[str] = mapped_column(ForeignKey("faculty_profiles.id"), nullable=False)
    status: Mapped[EnrollmentStatus] = mapped_column(String, default=EnrollmentStatus.ENROLLED)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    program: Mapped["Program"] = relationship("Program", back_populates="enrollments")
    faculty: Mapped["FacultyProfile"] = relationship("FacultyProfile", back_populates="enrollments")
