
from datetime import datetime
from uuid import uuid4

from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class FacultyProfile(Base):
    __tablename__ = "faculty_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    department: Mapped[str] = mapped_column(String, nullable=True)
    designation: Mapped[str] = mapped_column(String, nullable=True)
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="faculty_profile")
    skills: Mapped[list["FacultySkill"]] = relationship("FacultySkill", back_populates="faculty")
    enrollments: Mapped[list["Enrollment"]] = relationship("Enrollment", back_populates="faculty")
    attempts: Mapped[list["Attempt"]] = relationship("Attempt", back_populates="faculty")
    growth_plans: Mapped[list["GrowthPlan"]] = relationship("GrowthPlan", back_populates="faculty")
