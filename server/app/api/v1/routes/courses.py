
import random
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.enums import UserRole
from app.services.course_service import CourseService
from app.services.llm_service import LLMService
from app.schemas.course import (
    CourseCreate, CourseUpdate, CourseOut, CourseListOut,
    CourseModuleCreate, CourseModuleUpdate, CourseModuleOut,
    ModuleQuizCreate, ModuleQuizOut,
    AssessmentQuestionCreate, AssessmentQuestionOut,
    CourseEnrollmentOut, LessonProgressUpdate, LessonProgressOut,
    QuizSubmit, AssessmentSubmit, CourseAttemptOut, CourseAnalyticsOut, CourseProgressOut
)

router = APIRouter()


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Course CRUD (Admin) ───────────────────────────────────────────────────────

@router.get("", response_model=List[CourseListOut])
async def list_courses(
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List courses — faculty sees published only, admin sees all."""
    svc = CourseService(db)
    published_only = current_user.role != UserRole.ADMIN
    courses = await svc.get_courses(published_only=published_only)
    return [
        {**c.__dict__, "module_count": len(c.modules)}
        for c in courses
    ]


@router.post("", response_model=CourseOut, status_code=201)
async def create_course(
    body: CourseCreate,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin)
):
    svc = CourseService(db)
    course = await svc.create_course(body.model_dump(), creator_id=current_user.id)
    return course


@router.get("/my-enrollments", response_model=List[CourseEnrollmentOut])
async def my_enrollments(
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    svc = CourseService(db)
    return await svc.get_my_enrollments(current_user.id)


@router.get("/analytics", response_model=List[CourseAnalyticsOut])
async def course_analytics(
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin)
):
    svc = CourseService(db)
    return await svc.get_analytics()


@router.get("/{course_id}", response_model=CourseOut)
async def get_course(
    course_id: str,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    svc = CourseService(db)
    course = await svc.get_course(course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    return course


@router.put("/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: str,
    body: CourseUpdate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin)
):
    svc = CourseService(db)
    course = await svc.get_course(course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    return await svc.update_course(course, body.model_dump(exclude_none=True))


@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: str,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin)
):
    svc = CourseService(db)
    course = await svc.get_course(course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    await svc.delete_course(course)


# ── Modules (Admin) ──────────────────────────────────────────────────────────

@router.post("/{course_id}/modules", response_model=CourseModuleOut, status_code=201)
async def add_module(
    course_id: str,
    body: CourseModuleCreate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin)
):
    svc = CourseService(db)
    return await svc.add_module(course_id, body.model_dump())


@router.put("/{course_id}/modules/{module_id}", response_model=CourseModuleOut)
async def update_module(
    course_id: str,
    module_id: str,
    body: CourseModuleUpdate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin)
):
    svc = CourseService(db)
    module = await svc.get_module(module_id)
    if not module or module.course_id != course_id:
        raise HTTPException(404, "Module not found")
    return await svc.update_module(module, body.model_dump(exclude_none=True))


@router.delete("/{course_id}/modules/{module_id}", status_code=204)
async def delete_module(
    course_id: str,
    module_id: str,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin)
):
    svc = CourseService(db)
    module = await svc.get_module(module_id)
    if not module or module.course_id != course_id:
        raise HTTPException(404, "Module not found")
    await svc.delete_module(module)


# ── Module Quiz (Admin) ───────────────────────────────────────────────────────

@router.post("/{course_id}/modules/{module_id}/quiz", response_model=ModuleQuizOut, status_code=201)
async def add_quiz_question(
    course_id: str,
    module_id: str,
    body: ModuleQuizCreate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin)
):
    svc = CourseService(db)
    return await svc.add_quiz_question(module_id, body.model_dump())


@router.delete("/{course_id}/modules/{module_id}/quiz/{quiz_id}", status_code=204)
async def delete_quiz_question(
    course_id: str, module_id: str, quiz_id: str,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin)
):
    svc = CourseService(db)
    await svc.delete_quiz_question(quiz_id)


# ── Assessment Questions (Admin) ──────────────────────────────────────────────

@router.post("/{course_id}/assessment-questions", response_model=AssessmentQuestionOut, status_code=201)
async def add_assessment_question(
    course_id: str,
    body: AssessmentQuestionCreate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin)
):
    svc = CourseService(db)
    return await svc.add_assessment_question(course_id, body.model_dump())


@router.delete("/{course_id}/assessment-questions/{question_id}", status_code=204)
async def delete_assessment_question(
    course_id: str, question_id: str,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(require_admin)
):
    svc = CourseService(db)
    await svc.delete_assessment_question(question_id)


# ── Enrollment (Faculty) ──────────────────────────────────────────────────────

@router.post("/{course_id}/enroll", response_model=CourseEnrollmentOut)
async def enroll_in_course(
    course_id: str,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    svc = CourseService(db)
    existing = await svc.get_enrollment(current_user.id, course_id)
    if existing:
        raise HTTPException(400, "Already enrolled")
    return await svc.enroll(current_user.id, course_id)


@router.get("/{course_id}/progress", response_model=CourseProgressOut)
async def get_progress(
    course_id: str,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    svc = CourseService(db)
    course = await svc.get_course(course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    return await svc.get_course_progress(current_user.id, course_id)


# ── Lesson Progress (Faculty) ─────────────────────────────────────────────────

@router.put("/progress/{module_id}", response_model=LessonProgressOut)
async def update_lesson_progress(
    module_id: str,
    body: LessonProgressUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    svc = CourseService(db)
    return await svc.upsert_lesson_progress(
        current_user.id, module_id, body.watched_seconds, body.completed
    )


@router.post("/progress/{module_id}/quiz", response_model=LessonProgressOut)
async def submit_mini_quiz(
    module_id: str,
    body: QuizSubmit,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    svc = CourseService(db)
    return await svc.submit_quiz(current_user.id, module_id, body.answers)


# ── Final Assessment (Faculty) ────────────────────────────────────────────────

@router.get("/{course_id}/assessment", response_model=List[AssessmentQuestionOut])
async def get_assessment(
    course_id: str,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Return assessment questions WITHOUT correct answers.
    Falls back to module quiz questions (video-topic based) when no final bank exists.
    """
    svc = CourseService(db)
    questions = await svc.get_assessment_questions(course_id)
    random.shuffle(questions)
    return [
        {
            "id": q["id"],
            "course_id": q["course_id"],
            "question_text": q["question_text"],
            "options": q["options"],
        }
        for q in questions
    ]


@router.post("/{course_id}/assessment", response_model=CourseAttemptOut)
async def submit_assessment(
    course_id: str,
    body: AssessmentSubmit,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    svc = CourseService(db)
    attempt, wrong_questions = await svc.submit_assessment(
        current_user.id, course_id, body.answers, body.time_taken_seconds
    )

    # Generate AI feedback asynchronously
    try:
        llm = LLMService()
        course = await svc.get_course(course_id)
        feedback = await llm.generate_course_feedback(wrong_questions, course.title if course else "this course")
        if feedback:
            await svc.save_ai_feedback(attempt.id, feedback)
            attempt.ai_feedback = feedback
    except Exception:
        pass  # feedback is optional — don't fail the submission

    return attempt


@router.get("/{course_id}/attempt", response_model=CourseAttemptOut)
async def get_my_attempt(
    course_id: str,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    svc = CourseService(db)
    attempt = await svc.get_latest_attempt(current_user.id, course_id)
    if not attempt:
        raise HTTPException(404, "No attempt found")
    return attempt
