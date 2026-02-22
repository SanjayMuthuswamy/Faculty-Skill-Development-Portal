from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.crud.program import program as crud_program
from app.crud.program import enrollment as crud_enrollment
from app.schemas.program import ProgramCreate, ProgramResponse, EnrollmentCreate, EnrollmentResponse
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[ProgramResponse])
async def read_programs(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve programs.
    """
    programs = await crud_program.get_multi(db, skip=skip, limit=limit)
    return programs

@router.post("/", response_model=ProgramResponse)
async def create_program(
    *,
    db: AsyncSession = Depends(deps.get_db),
    program_in: ProgramCreate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Create new program.
    """
    program = await crud_program.create(db, obj_in=program_in)
    return program

@router.post("/{program_id}/enroll", response_model=EnrollmentResponse)
async def enroll_program(
    *,
    db: AsyncSession = Depends(deps.get_db),
    program_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Enroll in a program.
    """
    program = await crud_program.get(db, id=program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
        
    existing = await crud_enrollment.get_by_user_and_program(db, user_id=current_user.id, program_id=program_id)
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")
        
    enrollment = await crud_enrollment.create(
        db, obj_in=EnrollmentCreate(program_id=program_id), user_id=current_user.id
    )
    return enrollment
