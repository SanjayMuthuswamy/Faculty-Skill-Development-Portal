
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class FacultyNewsPreferences(Base):
    __tablename__ = "faculty_news_preferences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    faculty_id: Mapped[str] = mapped_column(ForeignKey("faculty_profiles.id"), unique=True, nullable=False)
    topics: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationship
    faculty: Mapped["FacultyProfile"] = relationship("FacultyProfile")
