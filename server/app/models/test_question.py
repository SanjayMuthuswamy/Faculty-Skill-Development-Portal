
from uuid import uuid4
from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class TestQuestion(Base):
    __tablename__ = "test_questions"
    __table_args__ = (
        UniqueConstraint('test_id', 'question_id', name='uq_test_question'),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    test_id: Mapped[str] = mapped_column(ForeignKey("tests.id"), nullable=False)
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"), nullable=False)

    # Relationships
    test: Mapped["Test"] = relationship("Test", back_populates="question_links")
    question: Mapped["Question"] = relationship("Question")
