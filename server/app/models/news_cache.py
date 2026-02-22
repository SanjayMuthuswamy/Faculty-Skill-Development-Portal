
from datetime import datetime
from uuid import uuid4

from sqlalchemy import String, Integer, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

class NewsCache(Base):
    __tablename__ = "news_cache"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    topic: Mapped[str] = mapped_column(String, index=True, nullable=False)
    json_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ttl_seconds: Mapped[int] = mapped_column(Integer, default=3600)
    
    @property
    def is_expired(self) -> bool:
        age = (datetime.utcnow() - self.fetched_at).total_seconds()
        return age > self.ttl_seconds
