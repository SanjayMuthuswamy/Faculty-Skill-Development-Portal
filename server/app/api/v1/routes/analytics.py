from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.v1.deps import get_current_user, get_session
from app.models.user import User, UserRole
from app.schemas.analytics import DepartmentSummary, FacultyAnalytics
from app.services.analytics_service import AnalyticsService

router = APIRouter(tags=["analytics"])

@router.get("/department-summary", response_model=List[DepartmentSummary])
async def get_department_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
        
    service = AnalyticsService(db)
    return await service.get_department_summary()

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
             
    service = AnalyticsService(db)
    analytics = await service.get_faculty_analytics(faculty_id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Faculty analytics not found")
    return analytics

@router.get("/me", response_model=FacultyAnalytics)
async def get_my_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if not current_user.faculty_profile:
        raise HTTPException(status_code=400, detail="User has no faculty profile")
        
    service = AnalyticsService(db)
    analytics = await service.get_faculty_analytics(current_user.faculty_profile.id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Analytics not found")
    return analytics
