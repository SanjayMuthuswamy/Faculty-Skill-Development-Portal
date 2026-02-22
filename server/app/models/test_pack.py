
from uuid import uuid4

from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class TestPack(Base):
    __tablename__ = "test_packs"
    __table_args__ = (
        UniqueConstraint('test_id', 'pack_id', name='uq_test_pack'),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    test_id: Mapped[str] = mapped_column(ForeignKey("tests.id"), nullable=False)
    pack_id: Mapped[str] = mapped_column(ForeignKey("question_packs.id"), nullable=False)

    # Relationships
    test: Mapped["Test"] = relationship("Test", back_populates="pack_links")
    pack: Mapped["QuestionPack"] = relationship("QuestionPack", back_populates="test_links")
