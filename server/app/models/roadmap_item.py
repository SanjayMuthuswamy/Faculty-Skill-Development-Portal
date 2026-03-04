
from uuid import uuid4

from sqlalchemy import String, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RoadmapItem(Base):
    """Tracks per-item completion state within a roadmap week."""
    __tablename__ = "roadmap_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    week_id: Mapped[str] = mapped_column(ForeignKey("roadmap_weeks.id"), nullable=False)
    item_type: Mapped[str] = mapped_column(String(20), nullable=False)   # "goal" | "practice"
    item_index: Mapped[int] = mapped_column(Integer, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    week: Mapped["RoadmapWeek"] = relationship("RoadmapWeek", back_populates="items")
