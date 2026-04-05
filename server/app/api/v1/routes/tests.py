from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.v1.deps import get_current_user, get_session, require_role
from app.models.user import User, UserRole
from app.schemas.test import Test as TestSchema, TestCreate, TestUpdate, TestBulkCreateRequest
from app.services.test_service import TestService

router = APIRouter(tags=["tests"])


def _validate_publish_test_payload(payload: dict) -> None:
    wants_publish = bool(payload.get("is_published"))
    if not wants_publish:
        return

    description = (payload.get("description") or "").strip()
    pack_ids = payload.get("pack_ids") or []
    question_ids = payload.get("question_ids") or []
    if len(description) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Published test requires a description with at least 20 characters.",
        )
    if not pack_ids and not question_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Published test requires at least one question source (pack_ids or question_ids).",
        )

@router.get("/", response_model=List[TestSchema])
async def list_tests(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    service = TestService(db)
    published_only = current_user.role != UserRole.ADMIN
    return await service.get_all(skip=skip, limit=limit, published_only=published_only)

@router.post("/", response_model=TestSchema)
async def create_test(
    test_in: TestCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    payload = test_in.model_dump()
    _validate_publish_test_payload(payload)

    service = TestService(db)
    try:
        test = await service.create_test(TestCreate(**payload), current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    # Re-fetch with questions loaded via selectinload
    return await service.get_test(test.id) or test


@router.post("/bulk", response_model=List[TestSchema])
async def create_tests_bulk(
    payload: TestBulkCreateRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session),
):
    if not payload.tests:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No tests provided")

    service = TestService(db)
    created: List[TestSchema] = []
    for test_in in payload.tests:
        test_payload = test_in.model_dump()
        _validate_publish_test_payload(test_payload)
        try:
            created_test = await service.create_test(TestCreate(**test_payload), current_user.id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        hydrated = await service.get_test(created_test.id)
        if hydrated:
            created.append(hydrated)

    return created

@router.get("/{test_id}", response_model=TestSchema)
async def get_test(
    test_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    service = TestService(db)
    test = await service.get_test(test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if current_user.role != UserRole.ADMIN and not test.is_published:
        raise HTTPException(status_code=404, detail="Test not found")
    return test

@router.patch("/{test_id}", response_model=TestSchema)
async def update_test(
    test_id: str,
    test_in: TestUpdate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = TestService(db)
    patch_data = test_in.model_dump(exclude_none=True)

    if patch_data.get("is_published") is True:
        existing = await service.get_test(test_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Test not found")
        _validate_publish_test_payload(
            {
                "is_published": True,
                "description": patch_data.get("description", existing.description),
                "pack_ids": patch_data.get("pack_ids", getattr(existing, "pack_ids", [])),
                "question_ids": patch_data.get("question_ids", getattr(existing, "question_ids", [])),
            }
        )

    try:
        updated = await service.update_test(test_id, patch_data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if not updated:
        raise HTTPException(status_code=404, detail="Test not found")
    return updated

@router.delete("/{test_id}")
async def delete_test(
    test_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = TestService(db)
    success = await service.delete_test(test_id)
    if not success:
        raise HTTPException(status_code=404, detail="Test not found")
    return {"status": "success"}
