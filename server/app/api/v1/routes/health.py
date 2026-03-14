"""Health check routes."""

from fastapi import APIRouter, Depends, HTTPException
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
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={"status": "error", "database": "disconnected"},
        ) from exc

    return {"status": "ok", "database": "connected"}
