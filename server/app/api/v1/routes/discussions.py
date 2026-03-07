from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_session
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.discussion import Discussion, DiscussionReply

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class ReplyOut(BaseModel):
    id: str
    discussion_id: str
    faculty_id: str
    author_name: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DiscussionOut(BaseModel):
    id: str
    faculty_id: str
    author_name: str
    title: str
    content: str
    category: str
    created_at: datetime
    reply_count: int

    model_config = {"from_attributes": True}


class DiscussionDetailOut(DiscussionOut):
    replies: List[ReplyOut] = []


# ── Helpers ───────────────────────────────────────────────────────────────────

def _disc_out(d: Discussion) -> dict:
    return {
        "id": d.id,
        "faculty_id": d.faculty_id,
        "author_name": d.author.name if d.author else "Unknown",
        "title": d.title,
        "content": d.content,
        "category": d.category,
        "created_at": d.created_at,
        "reply_count": len(d.replies) if d.replies else 0,
    }


def _reply_out(r: DiscussionReply) -> dict:
    return {
        "id": r.id,
        "discussion_id": r.discussion_id,
        "faculty_id": r.faculty_id,
        "author_name": r.author.name if r.author else "Unknown",
        "content": r.content,
        "created_at": r.created_at,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[DiscussionOut])
async def list_discussions(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user)
):
    q = select(Discussion).options(
        selectinload(Discussion.replies),
        selectinload(Discussion.author)
    ).order_by(Discussion.created_at.desc())
    if category:
        q = q.where(Discussion.category == category)
    result = await db.execute(q)
    discussions = result.scalars().all()
    return [_disc_out(d) for d in discussions]


@router.post("", status_code=201)
async def create_discussion(
    body: dict,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    d = Discussion(
        faculty_id=current_user.id,
        title=body.get("title", ""),
        content=body.get("content", ""),
        category=body.get("category", "general"),
    )
    db.add(d)
    await db.commit()
    await db.refresh(d)
    # reload with relationships
    result = await db.execute(
        select(Discussion).options(
            selectinload(Discussion.replies),
            selectinload(Discussion.author)
        ).where(Discussion.id == d.id)
    )
    d = result.scalar_one()
    return _disc_out(d)


@router.get("/{discussion_id}")
async def get_discussion(
    discussion_id: str,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Discussion).options(
            selectinload(Discussion.replies).selectinload(DiscussionReply.author),
            selectinload(Discussion.author)
        ).where(Discussion.id == discussion_id)
    )
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Discussion not found")
    out = _disc_out(d)
    out["replies"] = [_reply_out(r) for r in (d.replies or [])]
    return out


@router.post("/{discussion_id}/replies", status_code=201)
async def add_reply(
    discussion_id: str,
    body: dict,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    r = DiscussionReply(
        discussion_id=discussion_id,
        faculty_id=current_user.id,
        content=body.get("content", ""),
    )
    db.add(r)
    await db.commit()
    await db.refresh(r)
    result = await db.execute(
        select(DiscussionReply).options(selectinload(DiscussionReply.author)).where(DiscussionReply.id == r.id)
    )
    r = result.scalar_one()
    return _reply_out(r)
