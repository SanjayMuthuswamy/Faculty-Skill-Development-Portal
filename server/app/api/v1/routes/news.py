from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_session
from app.schemas.news import NewsResponse
from app.services.news_service import NewsService

router = APIRouter()

@router.get("/", response_model=NewsResponse)
async def get_news(
    topic: str = Query("AI", description="Topic to fetch news for"),
    db: AsyncSession = Depends(get_session)
):
    """Fetch professional trends and resources by topic."""
    service = NewsService(db)
    try:
        return await service.fetch_news(topic)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.get("/topics", response_model=list[str])
async def get_suggested_topics():
    """Get list of suggested professional development topics."""
    return ["AI", "Cloud Computing", "Cybersecurity", "DBMS", "Teaching Pedagogy", "Data Science", "Research Methodology"]
