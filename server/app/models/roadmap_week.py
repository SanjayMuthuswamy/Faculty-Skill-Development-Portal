
from uuid import uuid4

from sqlalchemy import String, Integer, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RoadmapWeek(Base):
    __tablename__ = "roadmap_weeks"
    __table_args__ = (
        UniqueConstraint("roadmap_id", "week_number", name="uq_roadmap_week"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    roadmap_id: Mapped[str] = mapped_column(ForeignKey("roadmaps.id"), nullable=False)
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)

    goals: Mapped[list] = mapped_column(JSON, default=list)
    topics: Mapped[list] = mapped_column(JSON, default=list)
    resources: Mapped[list] = mapped_column(JSON, default=list)   # [{title, url}]
    practice: Mapped[list] = mapped_column(JSON, default=list)

    # Relationships
    roadmap: Mapped["Roadmap"] = relationship("Roadmap", back_populates="weekly_plan")
    items: Mapped[list["RoadmapItem"]] = relationship(
        "RoadmapItem",
        back_populates="week",
        cascade="all, delete-orphan",
        order_by="RoadmapItem.item_index",
    )
