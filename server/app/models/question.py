
from datetime import datetime
from enum import Enum
from uuid import uuid4

from sqlalchemy import String, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

from app.db.base import Base
from app.models.enums import QuestionOption

class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    pack_id: Mapped[str] = mapped_column(ForeignKey("question_packs.id"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    
    option_a: Mapped[str] = mapped_column(Text, nullable=False)
    option_b: Mapped[str] = mapped_column(Text, nullable=False)
    option_c: Mapped[str] = mapped_column(Text, nullable=False)
    option_d: Mapped[str] = mapped_column(Text, nullable=False)
    
    correct_option: Mapped[QuestionOption] = mapped_column(String, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    pack: Mapped["QuestionPack"] = relationship("QuestionPack", back_populates="questions")
