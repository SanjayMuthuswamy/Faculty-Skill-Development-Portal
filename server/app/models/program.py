
from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4

from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.skill import SkillDomain

from app.models.enums import ProgramStatus

class Program(Base):
    __tablename__ = "programs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    domain: Mapped[SkillDomain] = mapped_column(String, nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    duration: Mapped[str] = mapped_column(String, nullable=True)
    seats: Mapped[int] = mapped_column(Integer, default=30)
    mode: Mapped[str] = mapped_column(String, default="Online") # Online, Offline, Hybrid
    topics: Mapped[list[str]] = mapped_column(JSON, default=list)
    benefits: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[ProgramStatus] = mapped_column(String, default=ProgramStatus.DRAFT)
    
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    created_by: Mapped["User"] = relationship("User")
    enrollments: Mapped[list["Enrollment"]] = relationship("Enrollment", back_populates="program", cascade="all, delete-orphan")
