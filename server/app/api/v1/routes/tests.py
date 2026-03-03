from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.v1.deps import get_current_user, get_session, require_role
from app.models.user import User, UserRole
from app.schemas.test import Test as TestSchema, TestCreate
from app.services.test_service import TestService

router = APIRouter(tags=["tests"])

@router.get("/", response_model=List[TestSchema])
async def list_tests(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session)
):
    service = TestService(db)
    return await service.get_all(skip=skip, limit=limit)  # was incorrectly get_multi

@router.post("/", response_model=TestSchema)
async def create_test(
    test_in: TestCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = TestService(db)
    test = await service.create_test(test_in, current_user.id)
    # Re-fetch with questions loaded via selectinload
    return await service.get_test(test.id) or test

@router.get("/{test_id}", response_model=TestSchema)
async def get_test(
    test_id: str,
    db: AsyncSession = Depends(get_session)
):
    service = TestService(db)
    test = await service.get_test(test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test

@router.patch("/{test_id}", response_model=TestSchema)
async def update_test(
    test_id: str,
    test_in: dict,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_session)
):
    service = TestService(db)
    updated = await service.update_test(test_id, test_in)
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
