from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
import logging

logger = logging.getLogger(__name__)

from app.api.v1.deps import get_current_user, get_session
from app.models.user import User, UserRole
from app.models.enrollment import Enrollment
from app.models.program import Program
from app.schemas.program import Enrollment as EnrollmentSchema, EnrollmentCreate

router = APIRouter(tags=["enrollments"])

@router.post("/", response_model=EnrollmentSchema)
async def enroll_in_program(
    enroll_in: EnrollmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    # Only faculty users should enroll - admins manage programs separately
    if current_user.role != UserRole.FACULTY:
        raise HTTPException(status_code=403, detail="Only faculty users can enroll in programs")
    
    if not current_user.faculty_profile:
        raise HTTPException(status_code=400, detail="Faculty user has no profile")

    # Program must exist and be currently enrollable.
    program_result = await db.execute(select(Program).where(Program.id == enroll_in.program_id))
    program = program_result.scalar_one_or_none()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    now = datetime.now(timezone.utc)
    end_date = program.end_date
    start_date = program.start_date
    if end_date and end_date.tzinfo is None:
        end_date = end_date.replace(tzinfo=timezone.utc)
    if start_date and start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)

    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Program has invalid dates")
    if end_date and now > end_date:
        raise HTTPException(status_code=400, detail="Program enrollment has ended")
        
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
    # Only faculty users have enrollments
    if current_user.role != UserRole.FACULTY:
        raise HTTPException(status_code=403, detail="Only faculty users can view their enrollments")
    
    if not current_user.faculty_profile:
        logger.warning(f"Faculty user {current_user.email} (id={current_user.id}) has no profile")
        raise HTTPException(status_code=400, detail="Faculty user has no profile")
        
    logger.info(f"Fetching enrollments for faculty_id={current_user.faculty_profile.id} (user={current_user.email})")
    result = await db.execute(
        select(Enrollment)
        .where(Enrollment.faculty_id == current_user.faculty_profile.id)
        .options(selectinload(Enrollment.program))
    )
    enrollments = result.scalars().all()
    logger.info(f"Found {len(enrollments)} enrollments for faculty_id={current_user.faculty_profile.id}")
    return enrollments
