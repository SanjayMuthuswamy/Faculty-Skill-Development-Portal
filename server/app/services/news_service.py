
import asyncio
import html
import hashlib
import httpx
import logging
import re
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.config import settings
from app.models.news_cache import NewsCache
from app.schemas.news import NewsItem, NewsResponse, PersonalizedNewsTopic, PersonalizedNewsResponse

logger = logging.getLogger(__name__)

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
                cache_entry.fetched_at = datetime.now(timezone.utc)
                cache_entry.ttl_seconds = settings.NEWS_CACHE_TTL_SECONDS
            else:
                new_cache = NewsCache(
                    topic=normalized_topic,
                    json_payload={"items": [item.model_dump() for item in normalized_items]},
                    fetched_at=datetime.now(timezone.utc),
                    ttl_seconds=settings.NEWS_CACHE_TTL_SECONDS
                )
                self.db.add(new_cache)
            
            await self.db.commit()

            return NewsResponse(
                topic=topic,
                items=normalized_items,
                cached=False,
                lastFetchedAt=datetime.now(timezone.utc)
            )

        except Exception as e:
            # Provider failed. Serve stale cache if available; otherwise fail explicitly.
            logger.warning("News fetch failed for topic '%s': %s", topic, e)
            if cache_entry:
                return NewsResponse(
                    topic=topic,
                    items=cache_entry.json_payload.get("items", []),
                    cached=True,
                    lastFetchedAt=cache_entry.fetched_at
                )
            raise RuntimeError(
                "Unable to fetch fresh news right now. Please try again later."
            ) from e

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
        """Call NewsData.io API, with RSS fallback when API key/quota fails."""
        if not settings.NEWSDATA_API_KEY or settings.NEWSDATA_API_KEY == "your_key_here":
            logger.info("NewsData API key missing. Falling back to RSS for topic '%s'.", topic)
            return await self._fetch_from_rss(topic)

        try:
            return await self._fetch_from_newsdata(topic)
        except Exception as exc:
            # Keep feed usable even when provider key expires or quota is exceeded.
            logger.warning("NewsData provider failed for '%s': %s. Falling back to RSS.", topic, exc)
            return await self._fetch_from_rss(topic)

    async def _fetch_from_newsdata(self, topic: str) -> List[Dict[str, Any]]:
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

    async def _fetch_from_rss(self, topic: str) -> List[Dict[str, Any]]:
        """Fetch news from Google News RSS (no API key required)."""
        query = urllib.parse.quote_plus(topic.strip())
        rss_url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(rss_url)
            response.raise_for_status()
            root = ET.fromstring(response.text)

        items: List[Dict[str, Any]] = []
        ns = {"media": "http://search.yahoo.com/mrss/"}
        for item in root.findall(".//item"):
            title = item.findtext("title") or "No Title"
            link = item.findtext("link") or ""
            pub_date = item.findtext("pubDate")
            source = item.findtext("source") or "Google News"
            description = item.findtext("description") or ""
            media_el = item.find("media:content", ns) or item.find("media:thumbnail", ns)
            media_url = media_el.get("url") if media_el is not None else None
            image_from_desc = self._extract_first_image_url(description)
            items.append(
                {
                    "article_id": hashlib.md5(f"{title}{pub_date or ''}".encode()).hexdigest(),
                    "title": title,
                    "description": description,
                    "source_name": source,
                    "pubDate": pub_date,
                    "link": link,
                    "image_url": media_url or image_from_desc,
                }
            )
        return items

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
            summary = self._clean_text(summary)
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

    def _clean_text(self, text: str) -> str:
        """Remove markup and decode entities from provider payloads."""
        cleaned = html.unescape(text or "")
        cleaned = re.sub(r"<[^>]+>", " ", cleaned)
        return re.sub(r"\s+", " ", cleaned).strip()

    def _extract_first_image_url(self, html_text: str) -> Optional[str]:
        """Best-effort image URL extraction from RSS description HTML."""
        match = re.search(r'<img[^>]+src=[\'"]([^\'"]+)[\'"]', html_text or "", flags=re.IGNORECASE)
        return match.group(1).strip() if match else None

