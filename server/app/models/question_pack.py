
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, ForeignKey, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PackStatus, Difficulty


class QuestionPack(Base):
    __tablename__ = "question_packs"
    __table_args__ = (
        UniqueConstraint('domain', 'pack_name', name='uq_pack_domain_name'),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    pack_name: Mapped[str] = mapped_column(String, nullable=False)
    domain: Mapped[str] = mapped_column(String, nullable=False)
    topic: Mapped[str] = mapped_column(String, nullable=True)
    difficulty: Mapped[Difficulty] = mapped_column(String, default=Difficulty.BEGINNER)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[PackStatus] = mapped_column(String, default=PackStatus.DRAFT)
    
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    published_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    questions: Mapped[list["Question"]] = relationship("Question", back_populates="pack", cascade="all, delete-orphan")
    test_links: Mapped[list["TestPack"]] = relationship("TestPack", back_populates="pack")
