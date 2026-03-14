
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import deps
from app.models.user import User
from app.schemas.practice_set import PracticeSet, PracticeSetCreate, PracticeSetResultSubmit
from app.services.practice_set_service import PracticeSetService
from app.services.faculty_service import FacultyService

router = APIRouter()

@router.post("/", response_model=PracticeSet)
async def create_practice_set(
    set_in: PracticeSetCreate,
    db: AsyncSession = Depends(deps.get_session),
    current_user: User = Depends(deps.get_current_user)
):
    faculty_service = FacultyService(db)
    profile = await faculty_service.get_by_user_id(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
        
    service = PracticeSetService(db)
    try:
        return await service.generate_set(profile.id, set_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.get("/me", response_model=List[PracticeSet])
async def get_my_practice_sets(
    db: AsyncSession = Depends(deps.get_session),
    current_user: User = Depends(deps.get_current_user)
):
    faculty_service = FacultyService(db)
    profile = await faculty_service.get_by_user_id(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Faculty profile not found")
        
    service = PracticeSetService(db)
    return await service.get_sets_by_faculty(profile.id)

@router.get("/{set_id}", response_model=PracticeSet)
async def get_practice_set(
    set_id: str,
    db: AsyncSession = Depends(deps.get_session),
    current_user: User = Depends(deps.get_current_user)
):
    service = PracticeSetService(db)
    p_set = await service.get_set(set_id)
    if not p_set:
        raise HTTPException(status_code=404, detail="Practice set not found")
    return p_set

@router.post("/{set_id}/submit", response_model=PracticeSet)
async def submit_practice_result(
    set_id: str,
    result_in: PracticeSetResultSubmit,
    db: AsyncSession = Depends(deps.get_session),
    current_user: User = Depends(deps.get_current_user)
):
    service = PracticeSetService(db)
    p_set = await service.submit_result(set_id, result_in)
    if not p_set:
        raise HTTPException(status_code=404, detail="Practice set not found")
    return p_set
