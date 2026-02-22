
import asyncio
import hashlib
import httpx
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.config import settings
from app.models.news_cache import NewsCache
from app.schemas.news import NewsItem, NewsResponse, PersonalizedNewsTopic, PersonalizedNewsResponse

class NewsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def fetch_news(self, topic: str, limit: int = 10) -> NewsResponse:
        """Fetch news for a topic, using cache if available."""
        normalized_topic = topic.strip().lower()
        
        # 1. Check Cache
        stmt = select(NewsCache).where(NewsCache.topic == normalized_topic)
        result = await self.db.execute(stmt)
        cache_entry = result.scalar_one_or_none()

        if cache_entry and not cache_entry.is_expired:
            return NewsResponse(
                topic=topic,
                items=cache_entry.json_payload.get("items", []),
                cached=True,
                lastFetchedAt=cache_entry.fetched_at
            )

        # 2. Fetch Fresh from NewsData.io
        try:
            articles = await self._fetch_from_provider(topic)
            normalized_items = self._normalize_articles(articles, limit)
            
            # 3. Update Cache
            if cache_entry:
                cache_entry.json_payload = {"items": [item.model_dump() for item in normalized_items]}
                cache_entry.fetched_at = datetime.utcnow()
                cache_entry.ttl_seconds = settings.NEWS_CACHE_TTL_SECONDS
            else:
                new_cache = NewsCache(
                    topic=normalized_topic,
                    json_payload={"items": [item.model_dump() for item in normalized_items]},
                    fetched_at=datetime.utcnow(),
                    ttl_seconds=settings.NEWS_CACHE_TTL_SECONDS
                )
                self.db.add(new_cache)
            
            await self.db.commit()

            return NewsResponse(
                topic=topic,
                items=normalized_items,
                cached=False,
                lastFetchedAt=datetime.utcnow()
            )

        except Exception as e:
            # 4. Fallback to expired cache if provider fails
            if cache_entry:
                return NewsResponse(
                    topic=topic,
                    items=cache_entry.json_payload.get("items", []),
                    cached=True,
                    lastFetchedAt=cache_entry.fetched_at
                )
            
            # 5. Last resort: empty list
            return NewsResponse(
                topic=topic,
                items=[],
                cached=False,
                lastFetchedAt=datetime.utcnow()
            )

    async def get_personalized_news(self, faculty_id: str, topics: List[str]) -> PersonalizedNewsResponse:
        """Fetch news for multiple topics concurrently."""
        tasks = [self.fetch_news(topic, limit=8) for topic in topics]
        results = await asyncio.gather(*tasks)
        
        personalized_topics = [
            PersonalizedNewsTopic(
                topic=res.topic,
                items=res.items,
                cached=res.cached,
                lastFetchedAt=res.lastFetchedAt
            ) for res in results
        ]
        
        return PersonalizedNewsResponse(topics=personalized_topics)

    async def _fetch_from_provider(self, topic: str) -> List[Dict[str, Any]]:
        """Call NewsData.io API."""
        if not settings.NEWSDATA_API_KEY or settings.NEWSDATA_API_KEY == "your_key_here":
            raise ValueError("NewsData API key not configured")

        params = {
            "apikey": settings.NEWSDATA_API_KEY,
            "q": topic,
            "language": "en"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.NEWSDATA_BASE_URL, params=params)
            
            if response.status_code != 200:
                raise Exception(f"NewsData.io error: {response.status_code}")
            
            data = response.json()
            if data.get("status") == "error":
                raise Exception(f"NewsData.io API error: {data.get('message')}")
                
            return data.get("results", [])

    def _normalize_articles(self, articles: List[Dict[str, Any]], limit: int) -> List[NewsItem]:
        """Convert NewsData.io format to our NewsItem schema."""
        normalized = []
        for art in articles[:limit]:
            # Generate a stable ID if article_id is missing
            article_id = art.get("article_id")
            if not article_id:
                raw_id = f"{art.get('title', '')}{art.get('pubDate', '')}"
                article_id = hashlib.md5(raw_id.encode()).hexdigest()

            # Normalize summary
            summary = art.get("description") or art.get("content") or ""
            if len(summary) > 200:
                summary = summary[:197] + "..."

            item = NewsItem(
                id=article_id,
                title=art.get("title") or "No Title",
                summary=summary,
                source=art.get("source_id") or art.get("source_name") or "Unknown",
                publishedAt=art.get("pubDate"),
                url=art.get("link") or "",
                imageUrl=art.get("image_url")
            )
            normalized.append(item)
        return normalized
