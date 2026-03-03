
from datetime import datetime
from enum import Enum
from uuid import uuid4

from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class SkillStatus(str, Enum):
    VERIFIED = "VERIFIED"
    UNVERIFIED = "UNVERIFIED"
    ASSESSMENT_DUE = "ASSESSMENT_DUE"
    SELF_DECLARED = "SELF_DECLARED"

class FacultySkill(Base):
    __tablename__ = "faculty_skills"
    __table_args__ = (
        UniqueConstraint('faculty_id', 'skill_id', name='uq_faculty_skill'),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    faculty_id: Mapped[str] = mapped_column(ForeignKey("faculty_profiles.id"), nullable=False)
    skill_id: Mapped[str] = mapped_column(ForeignKey("skills.id"), nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=1)  # 1 to 5
    status: Mapped[SkillStatus] = mapped_column(String, default=SkillStatus.UNVERIFIED)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    faculty: Mapped["FacultyProfile"] = relationship("FacultyProfile", back_populates="skills")
    skill: Mapped["Skill"] = relationship("Skill", back_populates="faculty_links")
