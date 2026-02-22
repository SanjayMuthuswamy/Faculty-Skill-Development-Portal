"""Health check routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_session

router = APIRouter(tags=["health"])


@router.get("")
async def health_check(session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    """
    Health check endpoint.
    
    Returns status and database connectivity.
    """
    try:
        await session.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "ok",
        "database": db_status,
    }
