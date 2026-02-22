
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.v1.deps import get_current_user, get_session, require_role
from app.models.user import User, UserRole
from app.schemas.question_draft import QuestionDraftBatch, QuestionDraftBatchCreate, PublishConfig, QuestionDraftUpdate, QuestionDraft
from app.services.ai_question_service import AIQuestionService

router = APIRouter(tags=["ai-questions"])

@router.post("/generate", response_model=QuestionDraftBatch)
async def generate_draft(
    batch_in: QuestionDraftBatchCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = AIQuestionService(db)
    return await service.generate_draft(batch_in, current_user.id)

@router.get("/batches", response_model=List[QuestionDraftBatch])
async def list_draft_batches(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = AIQuestionService(db)
    return await service.get_batches(current_user.id)

@router.get("/batches/{batch_id}", response_model=QuestionDraftBatch)
async def get_draft_batch(
    batch_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = AIQuestionService(db)
    batch = await service.get_batch_by_id(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Draft batch not found")
    return batch

@router.patch("/batches/{batch_id}/questions/{index}", response_model=QuestionDraft)
async def update_draft_question(
    batch_id: str,
    index: int,
    update_in: QuestionDraftUpdate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = AIQuestionService(db)
    question = await service.update_question(batch_id, index, update_in)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@router.post("/batches/{batch_id}/approve/{index}")
async def approve_question(
    batch_id: str,
    index: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = AIQuestionService(db)
    success = await service.approve_question(batch_id, index)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"status": "success"}

@router.post("/batches/{batch_id}/reject/{index}")
async def reject_question(
    batch_id: str,
    index: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = AIQuestionService(db)
    success = await service.reject_question(batch_id, index)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"status": "success"}

@router.post("/batches/{batch_id}/publish")
async def publish_batch(
    batch_id: str,
    config: PublishConfig,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = AIQuestionService(db)
    success = await service.publish_to_pack(batch_id, config)
    if not success:
        raise HTTPException(status_code=404, detail="Draft batch not found")
    return {"status": "success"}
