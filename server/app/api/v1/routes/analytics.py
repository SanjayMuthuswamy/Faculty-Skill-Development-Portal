from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.v1.deps import get_current_user, get_session
from app.core.cache import app_cache
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.analytics import DepartmentSummary, FacultyAnalytics
from app.services.analytics_service import AnalyticsService

router = APIRouter(tags=["analytics"])

# ── Static routes MUST come before /{faculty_id} to avoid routing conflicts ──

@router.get("/department-summary", response_model=List[DepartmentSummary])
async def get_department_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    async def load_summary():
        service = AnalyticsService(db)
        data = await service.get_department_summary()
        return [item.model_dump(mode="json") for item in data]

    return await app_cache.get_or_set(
        "analytics:department-summary",
        load_summary,
        ttl_seconds=settings.APP_CACHE_TTL_SECONDS,
    )

@router.get("/me", response_model=FacultyAnalytics)
async def get_my_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if not current_user.faculty_profile:
        raise HTTPException(status_code=400, detail="User has no faculty profile")

    faculty_id = current_user.faculty_profile.id

    async def load_analytics():
        service = AnalyticsService(db)
        analytics = await service.get_faculty_analytics(faculty_id)
        return analytics.model_dump(mode="json") if analytics else None

    analytics = await app_cache.get_or_set(
        f"analytics:faculty:{faculty_id}",
        load_analytics,
        ttl_seconds=settings.APP_CACHE_SHORT_TTL_SECONDS,
    )
    if not analytics:
        raise HTTPException(status_code=404, detail="Analytics not found")
    return analytics

# ── Dynamic param route LAST ──

@router.get("/faculty/{faculty_id}", response_model=FacultyAnalytics)
async def get_faculty_analytics(
    faculty_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    # Admin can see any, Faculty can see only their own
    if current_user.role != UserRole.ADMIN:
        if not current_user.faculty_profile or current_user.faculty_profile.id != faculty_id:
             raise HTTPException(status_code=403, detail="Insufficient permissions")

    async def load_analytics():
        service = AnalyticsService(db)
        analytics = await service.get_faculty_analytics(faculty_id)
        return analytics.model_dump(mode="json") if analytics else None

    analytics = await app_cache.get_or_set(
        f"analytics:faculty:{faculty_id}",
        load_analytics,
        ttl_seconds=settings.APP_CACHE_SHORT_TTL_SECONDS,
    )
    if not analytics:
        raise HTTPException(status_code=404, detail="Faculty analytics not found")
    return analytics
