
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class NewsItem(BaseModel):
    id: str
    title: str
    summary: str
    source: str
    publishedAt: Optional[str] = None
    url: str
    imageUrl: Optional[str] = None

class NewsResponse(BaseModel):
    topic: str
    items: List[NewsItem]
    cached: bool
    lastFetchedAt: datetime

class PersonalizedNewsTopic(BaseModel):
    topic: str
    items: List[NewsItem]
    cached: bool
    lastFetchedAt: datetime

class PersonalizedNewsResponse(BaseModel):
    topics: List[PersonalizedNewsTopic]

class NewsPreferencesBase(BaseModel):
    topics: List[str]

class NewsPreferencesCreate(NewsPreferencesBase):
    pass

class NewsPreferencesUpdate(NewsPreferencesBase):
    pass

class NewsPreferences(NewsPreferencesBase):
    faculty_id: str
    updated_at: datetime

    class Config:
        from_attributes = True
