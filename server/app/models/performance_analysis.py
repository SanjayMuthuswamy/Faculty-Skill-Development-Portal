
from datetime import datetime
from uuid import uuid4
from typing import Optional

from sqlalchemy import String, ForeignKey, DateTime, JSON, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PerformanceAnalysisStatus

class PerformanceAnalysis(Base):
    __tablename__ = "performance_analysis"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"), unique=True, nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    
    # Denormalized for fast dashboarding
    topic: Mapped[str] = mapped_column(String, nullable=False)
    difficulty: Mapped[str] = mapped_column(String, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Structured LLM Feedback
    next_difficulty: Mapped[str] = mapped_column(String, nullable=True) # Easy/Medium/Hard
    strengths: Mapped[str] = mapped_column(Text, nullable=True)
    weaknesses: Mapped[str] = mapped_column(Text, nullable=True)
    skill_gaps: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    recommendations: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    
    # Audit & Lifecycle
    prompt_version: Mapped[str] = mapped_column(String, default="1.0", nullable=False)
    status: Mapped[PerformanceAnalysisStatus] = mapped_column(String, default=PerformanceAnalysisStatus.PENDING, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Metadata
    raw_llm_output: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True) # For audit/debugging
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    attempt: Mapped["Attempt"] = relationship("Attempt")
    user: Mapped["User"] = relationship("User")
