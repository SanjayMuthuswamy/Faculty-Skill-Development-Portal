import logging
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

logger = logging.getLogger(__name__)

from app.api.v1.deps import get_current_user, get_session, require_role
from app.models.enums import ProgramStatus
from app.models.user import User, UserRole
from app.models.program import Program
from app.core.pagination import get_pagination_bounds
from app.schemas.program import Program as ProgramSchema, ProgramCreate, ProgramUpdate

router = APIRouter(tags=["programs"])


def _validate_publishable_program(payload: dict) -> None:
    """Guardrails before allowing a program to be published."""
    errors: list[str] = []
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    description = payload.get("description")
    seats = payload.get("seats")
    topics = payload.get("topics")

    if not start_date:
        errors.append("Start date is required for publishing")
    if not end_date:
        errors.append("End date is required for publishing")
    if start_date and end_date and start_date >= end_date:
        errors.append("End date must be after start date")
    if not description or not str(description).strip():
        errors.append("Description is required for publishing")
    if seats is None or int(seats) <= 0:
        errors.append("Seats must be greater than 0")
    if not topics or len(topics) == 0:
        errors.append("At least one topic is required for publishing")

    if errors:
        raise HTTPException(status_code=400, detail=errors)

@router.get("/", response_model=List[ProgramSchema])
async def list_programs(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    query = (
        select(Program)
        .offset(skip)
        .limit(limit)
        .options(selectinload(Program.enrollments))
    )
    if current_user.role != UserRole.ADMIN:
        query = query.where(
            Program.status.notin_([ProgramStatus.DRAFT, ProgramStatus.ARCHIVED])
        )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/paged")
async def list_programs_paged(
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    status: Optional[ProgramStatus] = None,
    mode: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    offset, normalized_page, normalized_page_size = get_pagination_bounds(page=page, page_size=page_size)

    base_query = select(Program)

    if current_user.role != UserRole.ADMIN:
        base_query = base_query.where(Program.status.notin_([ProgramStatus.DRAFT, ProgramStatus.ARCHIVED]))
    elif status is not None:
        base_query = base_query.where(Program.status == status)

    if mode:
        base_query = base_query.where(func.lower(Program.mode) == func.lower(mode))

    if search:
        search_term = f"%{search.strip()}%"
        if search_term != "%%":
            base_query = base_query.where(
                or_(
                    func.lower(Program.title).like(func.lower(search_term)),
                    func.lower(Program.description).like(func.lower(search_term)),
                    func.lower(Program.mode).like(func.lower(search_term)),
                )
            )

    total_stmt = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(total_stmt)).scalar_one()

    result = await db.execute(
        base_query
        .order_by(Program.created_at.desc())
        .offset(offset)
        .limit(normalized_page_size)
        .options(selectinload(Program.enrollments))
    )
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": normalized_page,
        "page_size": normalized_page_size,
        "total_pages": ceil(total / normalized_page_size) if total else 1,
    }

@router.post("/", response_model=ProgramSchema)
async def create_program(
    program_in: ProgramCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    try:
        if program_in.status == ProgramStatus.PUBLISHED:
            _validate_publishable_program(program_in.model_dump())

        logger.debug(f"Creating program: {program_in.title}")
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
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        logger.error(f"Error creating program: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create program: {str(e)}"
        )

@router.get("/{program_id}", response_model=ProgramSchema)
async def get_program(
    program_id: str,
    current_user: User = Depends(get_current_user),
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
    status_value = program.status.value if hasattr(program.status, "value") else program.status
    if current_user.role != UserRole.ADMIN and status_value in {ProgramStatus.DRAFT.value, ProgramStatus.ARCHIVED.value}:
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

    # Validate publish transition against merged payload (existing + incoming updates).
    merged_payload = {
        "start_date": db_program.start_date,
        "end_date": db_program.end_date,
        "description": db_program.description,
        "seats": db_program.seats,
        "topics": db_program.topics,
        "status": db_program.status,
    }
    merged_payload.update(update_data)
    status_value = merged_payload.get("status")
    if hasattr(status_value, "value"):
        status_value = status_value.value
    if status_value == ProgramStatus.PUBLISHED:
        _validate_publishable_program(merged_payload)

    for field, value in update_data.items():
        setattr(db_program, field, value)
    
    await db.commit()
    
    # Re-fetch with enrollments eagerly loaded to prevent MissingGreenlet during serialization
    result2 = await db.execute(
        select(Program)
        .where(Program.id == program_id)
        .options(selectinload(Program.enrollments))
    )
    return result2.scalar_one()

@router.delete("/{program_id}")
async def delete_program(
    program_id: str,
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

    # Protect historical enrollment data from accidental hard-delete cascades.
    if db_program.enrollments:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete program with existing enrollments. Remove enrollments first.",
        )

    await db.delete(db_program)
    await db.commit()
    return {"status": "success"}
