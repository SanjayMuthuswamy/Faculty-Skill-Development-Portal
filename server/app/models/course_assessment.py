
from uuid import uuid4

from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CourseAssessmentQuestion(Base):
    __tablename__ = "course_assessment_questions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id"), nullable=False)
    question_text: Mapped[str] = mapped_column(String, nullable=False)
    options: Mapped[dict] = mapped_column(JSON, nullable=False)   # {"A": "...", "B": "...", ...}
    correct_answer: Mapped[str] = mapped_column(String, nullable=False)
    explanation: Mapped[str] = mapped_column(String, default="")

    # Relationships
    course: Mapped["Course"] = relationship("Course", back_populates="assessment_questions")
