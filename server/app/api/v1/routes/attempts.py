from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.v1.deps import get_current_user, get_session
from app.models.user import User, UserRole
from app.models.enums import AttemptStatus
from app.schemas.attempt import Attempt as AttemptSchema, AttemptCreate, BulkSubmitAttempt
from app.services.attempt_service import AttemptService

router = APIRouter(tags=["attempts"])

@router.post("/", response_model=AttemptSchema)
async def start_attempt(
    attempt_in: AttemptCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if not current_user.faculty_profile:
        raise HTTPException(
            status_code=400,
            detail="User has no faculty profile. Only faculty members can take tests."
        )
    
    service = AttemptService(db)
    try:
        return await service.start_attempt(current_user.faculty_profile.id, attempt_in.test_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create attempt: {str(e)}")

@router.post("/{attempt_id}/answers")
async def submit_answer(
    attempt_id: str,
    question_id: str,
    selected_option: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    service = AttemptService(db)
    attempt = await service.get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail=f"Cannot submit answer: Attempt is already {attempt.status}")
        
    return await service.submit_answer(attempt_id, question_id, selected_option)

@router.post("/{attempt_id}/finish", response_model=AttemptSchema)
async def finish_attempt(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    service = AttemptService(db)
    attempt = await service.get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail=f"Cannot finish: Attempt is already {attempt.status}")
        
    attempt = await service.finish_attempt(attempt_id)
    return attempt

@router.post("/{attempt_id}/submit", response_model=AttemptSchema)
async def bulk_submit_attempt(
    attempt_id: str,
    submission: BulkSubmitAttempt,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    service = AttemptService(db)
    attempt = await service.get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail=f"Cannot submit: Attempt is already {attempt.status}")
        
    attempt = await service.bulk_submit(attempt_id, submission.answers)
    return attempt

@router.get("/me", response_model=List[AttemptSchema])
async def list_my_attempts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if not current_user.faculty_profile:
        raise HTTPException(status_code=400, detail="User has no faculty profile")
        
    service = AttemptService(db)
    return await service.get_faculty_attempts(current_user.faculty_profile.id)


@router.get("/faculty/{faculty_id}", response_model=List[AttemptSchema])
async def get_faculty_attempts(
    faculty_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Allows admins to fetch attempts for any faculty member. Faculty can only fetch their own."""
    # RBAC: Only admin or the faculty member themselves can access this
    if current_user.role != UserRole.ADMIN:
        if not current_user.faculty_profile or current_user.faculty_profile.id != faculty_id:
             raise HTTPException(status_code=403, detail="Insufficient permissions")
             
    service = AttemptService(db)
    return await service.get_faculty_attempts(faculty_id)


@router.get("/{attempt_id}", response_model=AttemptSchema)
async def get_attempt_by_id(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Get a single attempt with its answers – used by the TestResult page."""
    service = AttemptService(db)
    attempt = await service.get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return attempt
