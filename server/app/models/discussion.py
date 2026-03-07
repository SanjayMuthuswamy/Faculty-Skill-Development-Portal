from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4

from sqlalchemy import String, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Discussion(Base):
    __tablename__ = "discussions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    faculty_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String, default="general")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    replies: Mapped[List["DiscussionReply"]] = relationship(
        "DiscussionReply", back_populates="discussion", cascade="all, delete-orphan"
    )
    author: Mapped["User"] = relationship("User", foreign_keys=[faculty_id])


class DiscussionReply(Base):
    __tablename__ = "discussion_replies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    discussion_id: Mapped[str] = mapped_column(ForeignKey("discussions.id"), nullable=False)
    faculty_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    discussion: Mapped["Discussion"] = relationship("Discussion", back_populates="replies")
    author: Mapped["User"] = relationship("User", foreign_keys=[faculty_id])
