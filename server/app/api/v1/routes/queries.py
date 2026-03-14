from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.enums import UserRole
from app.models.faculty_query import FacultyQuery
from app.core.pagination import get_pagination_bounds

router = APIRouter()


def _query_out(q: FacultyQuery) -> dict:
    return {
        "id": q.id,
        "faculty_id": q.faculty_id,
        "faculty_name": q.faculty.name if q.faculty else "Unknown",
        "category": q.category,
        "description": q.description,
        "status": q.status,
        "created_at": q.created_at,
        "updated_at": q.updated_at,
    }


@router.post("", status_code=201)
async def submit_query(
    body: dict,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    fq = FacultyQuery(
        faculty_id=current_user.id,
        category=body.get("category", "general"),
        description=body.get("description", ""),
    )
    db.add(fq)
    await db.commit()
    await db.refresh(fq)
    result = await db.execute(
        select(FacultyQuery).options(selectinload(FacultyQuery.faculty)).where(FacultyQuery.id == fq.id)
    )
    fq = result.scalar_one()
    return _query_out(fq)


@router.get("/mine")
async def my_queries(
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(FacultyQuery)
        .options(selectinload(FacultyQuery.faculty))
        .where(FacultyQuery.faculty_id == current_user.id)
        .order_by(FacultyQuery.created_at.desc())
    )
    return [_query_out(q) for q in result.scalars().all()]


@router.get("")
async def list_queries(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Admin: list all queries."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Admin only")

    base_query = select(FacultyQuery).join(User, FacultyQuery.faculty_id == User.id)

    if status:
        base_query = base_query.where(FacultyQuery.status == status)

    if search:
        search_term = f"%{search.strip()}%"
        if search_term != "%%":
            base_query = base_query.where(
                or_(
                    func.lower(User.name).like(func.lower(search_term)),
                    func.lower(User.email).like(func.lower(search_term)),
                    func.lower(FacultyQuery.category).like(func.lower(search_term)),
                    func.lower(FacultyQuery.description).like(func.lower(search_term)),
                )
            )

    count_stmt = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    offset, normalized_page, normalized_page_size = get_pagination_bounds(
        page=page,
        page_size=page_size,
    )

    paged_query = (
        base_query.options(selectinload(FacultyQuery.faculty))
        .order_by(FacultyQuery.created_at.desc())
        .offset(offset)
        .limit(normalized_page_size)
    )
    result = await db.execute(paged_query)
    items = [_query_out(fq) for fq in result.scalars().all()]

    return {
        "items": items,
        "total": total,
        "page": normalized_page,
        "page_size": normalized_page_size,
        "total_pages": ceil(total / normalized_page_size) if total else 1,
    }


@router.patch("/{query_id}")
async def update_query_status(
    query_id: str,
    body: dict,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Admin: update status."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Admin only")
    result = await db.execute(
        select(FacultyQuery).options(selectinload(FacultyQuery.faculty)).where(FacultyQuery.id == query_id)
    )
    fq = result.scalar_one_or_none()
    if not fq:
        raise HTTPException(404, "Query not found")
    new_status = body.get("status")
    if new_status in ("pending", "reviewed", "resolved"):
        fq.status = new_status
    await db.commit()
    await db.refresh(fq)
    return _query_out(fq)
