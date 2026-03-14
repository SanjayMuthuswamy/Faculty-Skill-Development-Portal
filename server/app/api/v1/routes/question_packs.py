from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.api.v1.deps import get_current_user, get_session, require_role
from app.models.user import User, UserRole
from app.models.enums import PackStatus
from app.models.question_pack import QuestionPack
from app.models.question import Question
from app.core.pagination import get_pagination_bounds
from app.schemas.question_pack import QuestionPack as QuestionPackSchema, QuestionPackCreate, QuestionCreate, Question as QuestionSchema
from app.services.question_pack_service import QuestionPackService

router = APIRouter(tags=["question-packs"])

# ── Static question routes MUST come before /{pack_id} to avoid routing conflicts ──

@router.get("/questions", response_model=List[QuestionSchema])
async def list_all_questions(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    service = QuestionPackService(db)
    return await service.get_all_questions(skip=skip, limit=limit)


@router.get("/questions/paged")
async def list_all_questions_paged(
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    offset, normalized_page, normalized_page_size = get_pagination_bounds(page=page, page_size=page_size)

    base_query = select(Question)

    if search:
        search_term = f"%{search.strip()}%"
        if search_term != "%%":
            base_query = base_query.where(func.lower(Question.question_text).like(func.lower(search_term)))

    total_stmt = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(total_stmt)).scalar_one()

    result = await db.execute(
        base_query.order_by(Question.created_at.desc()).offset(offset).limit(normalized_page_size)
    )
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": normalized_page,
        "page_size": normalized_page_size,
        "total_pages": ceil(total / normalized_page_size) if total else 1,
    }

@router.patch("/questions/{question_id}", response_model=QuestionSchema)
async def update_question(
    question_id: str,
    question_in: QuestionCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = QuestionPackService(db)
    updated = await service.update_question(question_id, question_in.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Question not found")
    return updated

@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = QuestionPackService(db)
    success = await service.delete_question(question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"status": "success"}

# ── Pack-level routes ──

@router.get("/", response_model=List[QuestionPackSchema])
async def list_question_packs(
    skip: int = 0,
    limit: int = 100,
    domain: str = None,
    status: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    service = QuestionPackService(db)
    filters = {}
    if domain: filters["domain"] = domain
    if current_user.role != UserRole.ADMIN:
        filters["status"] = PackStatus.PUBLISHED.value
    elif status:
        filters["status"] = status
    return await service.get_all(skip=skip, limit=limit, filters=filters)


@router.get("/paged")
async def list_question_packs_paged(
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    domain: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    offset, normalized_page, normalized_page_size = get_pagination_bounds(page=page, page_size=page_size)

    base_query = select(QuestionPack)

    if domain:
        base_query = base_query.where(QuestionPack.domain == domain)

    if current_user.role != UserRole.ADMIN:
        base_query = base_query.where(QuestionPack.status == PackStatus.PUBLISHED.value)
    elif status:
        base_query = base_query.where(QuestionPack.status == status)

    if search:
        search_term = f"%{search.strip()}%"
        if search_term != "%%":
            base_query = base_query.where(
                or_(
                    func.lower(QuestionPack.pack_name).like(func.lower(search_term)),
                    func.lower(QuestionPack.topic).like(func.lower(search_term)),
                    func.lower(QuestionPack.description).like(func.lower(search_term)),
                )
            )

    total_stmt = select(func.count()).select_from(base_query.subquery())
    total = (await db.execute(total_stmt)).scalar_one()

    result = await db.execute(
        base_query
        .order_by(QuestionPack.created_at.desc())
        .offset(offset)
        .limit(normalized_page_size)
        .options(selectinload(QuestionPack.questions))
    )
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": normalized_page,
        "page_size": normalized_page_size,
        "total_pages": ceil(total / normalized_page_size) if total else 1,
    }

@router.post("/", response_model=QuestionPackSchema)
async def create_question_pack(
    pack_in: QuestionPackCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = QuestionPackService(db)
    return await service.create_pack(pack_in, current_user.id)

@router.get("/{pack_id}", response_model=QuestionPackSchema)
async def get_question_pack(
    pack_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    service = QuestionPackService(db)
    pack = await service.get_pack(pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Question pack not found")
    pack_status = pack.status.value if hasattr(pack.status, "value") else pack.status
    if current_user.role != UserRole.ADMIN and pack_status != PackStatus.PUBLISHED.value:
        raise HTTPException(status_code=404, detail="Question pack not found")
    return pack

@router.patch("/{pack_id}", response_model=QuestionPackSchema)
async def update_question_pack(
    pack_id: str,
    pack_in: QuestionPackCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = QuestionPackService(db)
    updated = await service.update_pack(pack_id, pack_in.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Question pack not found")
    return updated

@router.delete("/{pack_id}")
async def delete_question_pack(
    pack_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = QuestionPackService(db)
    success = await service.delete_pack(pack_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question pack not found")
    return {"status": "success"}

@router.post("/{pack_id}/questions", response_model=QuestionSchema)
async def add_question_to_pack(
    pack_id: str,
    question_in: QuestionCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = QuestionPackService(db)
    return await service.add_question(pack_id, question_in)
