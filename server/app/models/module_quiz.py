
from uuid import uuid4

from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ModuleQuiz(Base):
    __tablename__ = "module_quizzes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    module_id: Mapped[str] = mapped_column(ForeignKey("course_modules.id"), nullable=False)
    question_text: Mapped[str] = mapped_column(String, nullable=False)
    options: Mapped[dict] = mapped_column(JSON, nullable=False)   # {"A": "...", "B": "...", "C": "...", "D": "..."}
    correct_answer: Mapped[str] = mapped_column(String, nullable=False)  # "A" | "B" | "C" | "D"
    explanation: Mapped[str] = mapped_column(String, default="")

    # Relationships
    module: Mapped["CourseModule"] = relationship("CourseModule", back_populates="quiz_questions")
