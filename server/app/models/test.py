
from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4

from sqlalchemy import String, Integer, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.skill import SkillDomain
from app.models.enums import Difficulty

class Test(Base):
    __tablename__ = "tests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    short_description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tags: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list)
    domain: Mapped[SkillDomain] = mapped_column(String, nullable=False)
    difficulty: Mapped[Difficulty] = mapped_column(String, default=Difficulty.BEGINNER)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    pass_marks: Mapped[int] = mapped_column(Integer, default=50)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=30)
    
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    pack_links: Mapped[list["TestPack"]] = relationship("TestPack", back_populates="test")
    question_links: Mapped[list["TestQuestion"]] = relationship("TestQuestion", back_populates="test")
    attempts: Mapped[list["Attempt"]] = relationship("Attempt", back_populates="test")
