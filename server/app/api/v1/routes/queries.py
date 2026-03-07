from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.db.session import get_session
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.enums import UserRole
from app.models.faculty_query import FacultyQuery

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
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Admin: list all queries."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Admin only")
    q = select(FacultyQuery).options(selectinload(FacultyQuery.faculty)).order_by(FacultyQuery.created_at.desc())
    if status:
        q = q.where(FacultyQuery.status == status)
    result = await db.execute(q)
    return [_query_out(fq) for fq in result.scalars().all()]


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
