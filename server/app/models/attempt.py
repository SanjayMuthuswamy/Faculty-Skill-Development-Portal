
from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4

from sqlalchemy import String, Integer, ForeignKey, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AttemptStatus

class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    test_id: Mapped[str] = mapped_column(ForeignKey("tests.id"), nullable=False)
    faculty_id: Mapped[str] = mapped_column(ForeignKey("faculty_profiles.id"), nullable=False)
    
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    score: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    
    status: Mapped[AttemptStatus] = mapped_column(String, default=AttemptStatus.IN_PROGRESS)

    # Relationships
    test: Mapped["Test"] = relationship("Test", back_populates="attempts")
    faculty: Mapped["FacultyProfile"] = relationship("FacultyProfile", back_populates="attempts")
    answers: Mapped[list["AttemptAnswer"]] = relationship("AttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")
