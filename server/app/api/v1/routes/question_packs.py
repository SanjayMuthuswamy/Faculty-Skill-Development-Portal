from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.v1.deps import get_current_user, get_session, require_role
from app.models.user import User, UserRole
from app.schemas.question_pack import QuestionPack as QuestionPackSchema, QuestionPackCreate, QuestionCreate, Question as QuestionSchema
from app.services.question_pack_service import QuestionPackService

router = APIRouter(tags=["question-packs"])

@router.get("/", response_model=List[QuestionPackSchema])
async def list_question_packs(
    skip: int = 0,
    limit: int = 100,
    domain: str = None,
    status: str = None,
    db: AsyncSession = Depends(get_session)
):
    service = QuestionPackService(db)
    filters = {}
    if domain: filters["domain"] = domain
    if status: filters["status"] = status
    return await service.get_all(skip=skip, limit=limit, filters=filters)

@router.get("/{pack_id}", response_model=QuestionPackSchema)
async def get_question_pack(
    pack_id: str,
    db: AsyncSession = Depends(get_session)
):
    service = QuestionPackService(db)
    pack = await service.get_pack(pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Question pack not found")
    return pack

@router.post("/", response_model=QuestionPackSchema)
async def create_question_pack(
    pack_in: QuestionPackCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = QuestionPackService(db)
    return await service.create_pack(pack_in, current_user.id)

@router.patch("/{pack_id}", response_model=QuestionPackSchema)
async def update_question_pack(
    pack_id: str,
    pack_in: QuestionPackCreate, # Using Create for simplicity in schema
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

@router.get("/questions", response_model=List[QuestionSchema])
async def list_all_questions(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session)
):
    service = QuestionPackService(db)
    return await service.get_all_questions(skip=skip, limit=limit)

@router.patch("/questions/{question_id}", response_model=QuestionSchema)
async def update_question(
    question_id: str,
    question_in: QuestionCreate, # Using QuestionCreate for simplicity as patch usually takes a subset
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
