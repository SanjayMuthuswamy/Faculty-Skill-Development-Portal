
from datetime import datetime
from uuid import uuid4
from sqlalchemy import String, Enum, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import enum

class DraftBatchStatus(str, enum.Enum):
    PENDING = "pending"
    PUBLISHED = "published"
    FAILED = "failed"

class QuestionDraftStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class QuestionDraftBatch(Base):
    __tablename__ = "question_draft_batches"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    topic: Mapped[str] = mapped_column(String, nullable=False)
    domain: Mapped[str] = mapped_column(String, nullable=False)
    difficulty: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[DraftBatchStatus] = mapped_column(String, default=DraftBatchStatus.PENDING)
    prompt_version: Mapped[str] = mapped_column(String, default="1.0", nullable=False)
    
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    questions: Mapped[list["QuestionDraft"]] = relationship("QuestionDraft", back_populates="batch", cascade="all, delete-orphan")

class QuestionDraft(Base):
    __tablename__ = "question_drafts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    batch_id: Mapped[str] = mapped_column(ForeignKey("question_draft_batches.id"), nullable=False)
    
    question_text: Mapped[str] = mapped_column(String, nullable=False)
    option_a: Mapped[str] = mapped_column(String, nullable=False)
    option_b: Mapped[str] = mapped_column(String, nullable=False)
    option_c: Mapped[str] = mapped_column(String, nullable=False)
    option_d: Mapped[str] = mapped_column(String, nullable=False)
    correct_option: Mapped[str] = mapped_column(String, nullable=False)
    explanation: Mapped[str] = mapped_column(String, nullable=True)
    
    draft_status: Mapped[QuestionDraftStatus] = mapped_column(String, default=QuestionDraftStatus.PENDING)

    # Relationship
    batch: Mapped["QuestionDraftBatch"] = relationship("QuestionDraftBatch", back_populates="questions")
