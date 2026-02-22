
from datetime import datetime
from enum import Enum
from uuid import uuid4

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class SkillDomain(str, Enum):
    TEACHING = "Teaching"
    RESEARCH = "Research"
    TECHNOLOGY = "Technology"
    LEADERSHIP = "Leadership"
    COMMUNICATION = "Communication"
    AI = "Artificial Intelligence"
    CLOUD = "Cloud Computing"
    DATA = "Data & Analytics"
    CYBER = "Cybersecurity"

class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    domain: Mapped[SkillDomain] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    faculty_links: Mapped[list["FacultySkill"]] = relationship("FacultySkill", back_populates="skill")
