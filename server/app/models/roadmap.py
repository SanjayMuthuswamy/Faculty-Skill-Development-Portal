
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    skill: Mapped[str] = mapped_column(String(120), nullable=False)
    weeks: Mapped[int] = mapped_column(Integer, nullable=False)
    hours_per_week: Mapped[int] = mapped_column(Integer, nullable=False)
    current_level: Mapped[str] = mapped_column(String(20), nullable=False, default="beginner")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships (no backref to User to avoid lazy-load issues in async)
    weekly_plan: Mapped[list["RoadmapWeek"]] = relationship(
        "RoadmapWeek",
        back_populates="roadmap",
        cascade="all, delete-orphan",
        order_by="RoadmapWeek.week_number",
    )

