from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.api.v1.deps import get_current_user, get_session, require_role
from app.models.user import User, UserRole
from app.models.program import Program
from app.schemas.program import Program as ProgramSchema, ProgramCreate, ProgramUpdate

router = APIRouter(tags=["programs"])

@router.get("/", response_model=List[ProgramSchema])
async def list_programs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session)
):
    result = await db.execute(
        select(Program)
        .offset(skip)
        .limit(limit)
        .options(selectinload(Program.enrollments))
    )
    return result.scalars().all()

@router.post("/", response_model=ProgramSchema)
async def create_program(
    program_in: ProgramCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    db_program = Program(**program_in.model_dump(), created_by_id=current_user.id)
    db.add(db_program)
    await db.commit()
    await db.refresh(db_program)
    # Re-fetch with relationships loaded
    result = await db.execute(
        select(Program)
        .where(Program.id == db_program.id)
        .options(selectinload(Program.enrollments))
    )
    return result.scalar_one()

@router.get("/{program_id}", response_model=ProgramSchema)
async def get_program(
    program_id: str,
    db: AsyncSession = Depends(get_session)
):
    result = await db.execute(
        select(Program)
        .where(Program.id == program_id)
        .options(selectinload(Program.enrollments))
    )
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return program

@router.patch("/{program_id}", response_model=ProgramSchema)
async def update_program(
    program_id: str,
    program_in: ProgramUpdate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    result = await db.execute(
        select(Program)
        .where(Program.id == program_id)
        .options(selectinload(Program.enrollments))
    )
    db_program = result.scalar_one_or_none()
    if not db_program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    update_data = program_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_program, field, value)
    
    await db.commit()
    await db.refresh(db_program)
    return db_program

@router.delete("/{program_id}")
async def delete_program(
    program_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    result = await db.execute(select(Program).where(Program.id == program_id))
    db_program = result.scalar_one_or_none()
    if not db_program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    await db.delete(db_program)
    await db.commit()
    return {"status": "success"}
