
from uuid import uuid4

from sqlalchemy import String, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"
    __table_args__ = (
        UniqueConstraint('attempt_id', 'question_id', name='uq_attempt_question'),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"), nullable=False)
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"), nullable=False)
    
    selected_option: Mapped[str] = mapped_column(String, nullable=True)  # A, B, C, D
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    attempt: Mapped["Attempt"] = relationship("Attempt", back_populates="answers")
    question: Mapped["Question"] = relationship("Question")
