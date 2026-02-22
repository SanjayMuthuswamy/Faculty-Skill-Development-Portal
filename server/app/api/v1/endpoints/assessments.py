from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.crud.assessment import question_pack, question, test, attempt
from app.schemas.assessment import (
    QuestionPackCreate, QuestionPackResponse, 
    QuestionCreate, QuestionResponse,
    TestCreate, TestResponse,
    AttemptCreate, AttemptResponse, AttemptUpdate, SubmitAttempt
)
from app.models.user import User
from app.models.faculty_profile import FacultyProfile

router = APIRouter()

# --- Question Packs ---
@router.post("/packs", response_model=QuestionPackResponse)
async def create_pack(
    *,
    db: AsyncSession = Depends(deps.get_db),
    pack_in: QuestionPackCreate,
    current_user: User = Depends(deps.get_current_user), 
) -> Any:
    pack = await question_pack.create(db, obj_in=pack_in, user_id=current_user.id)
    return pack

@router.get("/packs/{pack_id}", response_model=QuestionPackResponse)
async def read_pack(
    *,
    db: AsyncSession = Depends(deps.get_db),
    pack_id: str,
) -> Any:
    pack = await question_pack.get_with_questions(db, id=pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    return pack

@router.post("/packs/{pack_id}/questions", response_model=QuestionResponse)
async def add_question(
    *,
    db: AsyncSession = Depends(deps.get_db),
    pack_id: str,
    question_in: QuestionCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    # Verify ownership or admin
    pack = await question_pack.get(db, id=pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
        
    # In a real app, check permissions more strictly
    if pack.created_by_id != current_user.id and current_user.role != "ADMIN":
         raise HTTPException(status_code=403, detail="Not authorized")
         
    q = await question.create(db, obj_in=question_in, pack_id=pack_id)
    return q

# --- Tests ---
@router.get("/tests", response_model=List[TestResponse])
async def read_tests(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    tests = await test.get_multi(db, skip=skip, limit=limit)
    return tests

@router.post("/tests", response_model=TestResponse)
async def create_test(
    *,
    db: AsyncSession = Depends(deps.get_db),
    test_in: TestCreate,
    current_user: User = Depends(deps.get_current_active_admin), # Only admins create tests usually?
) -> Any:
    t = await test.create(db, obj_in=test_in, created_by_id=current_user.id)
    return t

# --- Attempts ---
@router.post("/attempts", response_model=AttemptResponse)
async def create_attempt(
    *,
    db: AsyncSession = Depends(deps.get_db),
    attempt_in: AttemptCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role != "FACULTY":
        raise HTTPException(status_code=403, detail="Only faculty can attempt tests")

    # Get faculty profile
    result = await db.execute(select(FacultyProfile).filter(FacultyProfile.user_id == current_user.id))
    faculty = result.scalars().first()
    
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found")

    # Check if already attempted? (Optional logic)
    
    att = await attempt.create(db, obj_in=attempt_in, faculty_id=faculty.id)
    return att

@router.get("/attempts/{attempt_id}", response_model=AttemptResponse)
async def read_attempt(
    *,
    db: AsyncSession = Depends(deps.get_db),
    attempt_id: str,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    att = await attempt.get_with_answers(db, id=attempt_id)
    if not att:
        raise HTTPException(status_code=404, detail="Attempt not found")
    # Authorization checks (admin or owner) can be added here
    return att

@router.post("/attempts/{attempt_id}/submit", response_model=AttemptResponse)
async def submit_attempt(
    *,
    db: AsyncSession = Depends(deps.get_db),
    attempt_id: str,
    submission: SubmitAttempt,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    att = await attempt.submit(db, attempt_id=attempt_id, submission=submission)
    if not att:
         raise HTTPException(status_code=404, detail="Attempt not found")
    return att
