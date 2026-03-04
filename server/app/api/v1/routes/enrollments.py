from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
import logging

logger = logging.getLogger(__name__)

from app.api.v1.deps import get_current_user, get_session
from app.models.user import User, UserRole
from app.models.enrollment import Enrollment
from app.schemas.program import Enrollment as EnrollmentSchema, EnrollmentCreate

router = APIRouter(tags=["enrollments"])

@router.post("/", response_model=EnrollmentSchema)
async def enroll_in_program(
    enroll_in: EnrollmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if not current_user.faculty_profile:
        raise HTTPException(status_code=400, detail="User has no faculty profile")
        
    # Check if already enrolled
    result = await db.execute(
        select(Enrollment)
        .where(Enrollment.faculty_id == current_user.faculty_profile.id, Enrollment.program_id == enroll_in.program_id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already enrolled in this program")
        
    db_enrollment = Enrollment(
        faculty_id=current_user.faculty_profile.id,
        program_id=enroll_in.program_id
    )
    db.add(db_enrollment)
    await db.commit()
    await db.refresh(db_enrollment)
    return db_enrollment

@router.get("/me", response_model=List[EnrollmentSchema])
async def get_my_enrollments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if not current_user.faculty_profile:
        logger.warning(f"User {current_user.email} (id={current_user.id}) has no faculty profile")
        raise HTTPException(status_code=400, detail="User has no faculty profile")
        
    logger.info(f"Fetching enrollments for faculty_id={current_user.faculty_profile.id} (user={current_user.email})")
    result = await db.execute(
        select(Enrollment)
        .where(Enrollment.faculty_id == current_user.faculty_profile.id)
        .options(selectinload(Enrollment.program))
    )
    enrollments = result.scalars().all()
    logger.info(f"Found {len(enrollments)} enrollments for faculty_id={current_user.faculty_profile.id}")
    return enrollments
