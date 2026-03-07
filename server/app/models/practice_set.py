
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import String, Integer, ForeignKey, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.skill import SkillDomain

class PracticeSet(Base):
    __tablename__ = "practice_sets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    faculty_id: Mapped[str] = mapped_column(ForeignKey("faculty_profiles.id"), nullable=False)
    domain: Mapped[SkillDomain] = mapped_column(String, nullable=False)
    difficulty: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)  # PACK, WEAKNESS, CUSTOM
    topic: Mapped[str] = mapped_column(String, nullable=True)
    
    score: Mapped[int] = mapped_column(Integer, nullable=True)
    accuracy: Mapped[float] = mapped_column(Float, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    faculty: Mapped["FacultyProfile"] = relationship("FacultyProfile")
    questions: Mapped[list["PracticeSetQuestion"]] = relationship("PracticeSetQuestion", back_populates="practice_set", cascade="all, delete-orphan")

class PracticeSetQuestion(Base):
    __tablename__ = "practice_set_questions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    set_id: Mapped[str] = mapped_column(ForeignKey("practice_sets.id"), nullable=False)
    
    # We copy the question data here to make it independent of the original question bank if it was temporary or AI generated
    question_text: Mapped[str] = mapped_column(String, nullable=False)
    option_a: Mapped[str] = mapped_column(String, nullable=False)
    option_b: Mapped[str] = mapped_column(String, nullable=False)
    option_c: Mapped[str] = mapped_column(String, nullable=False)
    option_d: Mapped[str] = mapped_column(String, nullable=False)
    correct_option: Mapped[str] = mapped_column(String, nullable=False)
    explanation: Mapped[str] = mapped_column(String, nullable=True)
    
    practice_set: Mapped["PracticeSet"] = relationship("PracticeSet", back_populates="questions")
