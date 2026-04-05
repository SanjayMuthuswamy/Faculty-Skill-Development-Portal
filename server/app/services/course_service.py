
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.course import Course
from app.models.course_module import CourseModule
from app.models.course_enrollment import CourseEnrollment
from app.models.lesson_progress import LessonProgress
from app.models.course_attempt import CourseAttempt
from app.models.course_assessment import CourseAssessmentQuestion
from app.models.module_quiz import ModuleQuiz

MODULE_VIDEO_FALLBACKS: Dict[str, str] = {
    "Reading Academic Dashboards": "https://www.youtube.com/watch?v=hSPmj7mK6ng",
    "Turning Insights into Teaching Actions": "https://www.youtube.com/watch?v=R2hb_BT-MxM",
    "Prompting for Teaching Tasks": "https://www.youtube.com/watch?v=2ePf9rue1Ao",
    "Responsible AI Review": "https://www.youtube.com/watch?v=aR5N2Jl8k14",
}

COURSE_VIDEO_FALLBACKS: Dict[str, str] = {
    "Modern Data Literacy for Faculty": "https://www.youtube.com/watch?v=hSPmj7mK6ng",
    "Applied AI Workflows for Classroom Support": "https://www.youtube.com/watch?v=hfIUstzHs9A",
    "Artificial Intelligence for Educators": "https://www.youtube.com/watch?v=2ePf9rue1Ao",
    "Python Programming for Academic Research": "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
    "Cloud Computing Fundamentals": "https://www.youtube.com/watch?v=M988_fsOSWo",
    "Effective Research Methodology": "https://www.youtube.com/watch?v=b3VgC2WlNUQ",
    "Modern Teaching Strategies for Higher Education": "https://www.youtube.com/watch?v=R2hb_BT-MxM",
    "Data Science for Academic Decision Making": "https://www.youtube.com/watch?v=hSPmj7mK6ng",
}


class CourseService:

    def __init__(self, db: AsyncSession):
        self.db = db

    def _build_default_quiz_payloads(self, module: CourseModule) -> List[Dict[str, Any]]:
        """Generate fallback quiz questions when a module has no authored quiz."""
        title = (module.title or "This module").strip()
        takeaways = [
            t.strip()
            for t in (module.key_takeaways or [])
            if isinstance(t, str) and t.strip()
        ]
        if not takeaways:
            if module.description and module.description.strip():
                takeaways = [module.description.strip()]
            else:
                takeaways = [f"{title} introduces core concepts and practical usage."]

        primary_takeaway = takeaways[0]

        return [
            {
                "question_text": f"What is the primary focus of the module '{title}'?",
                "options": {
                    "A": "General campus administration updates",
                    "B": title,
                    "C": "Unrelated historical timelines",
                    "D": "Department budget planning",
                },
                "correct_answer": "B",
                "explanation": f"This module is specifically focused on '{title}'.",
            },
            {
                "question_text": f"Which statement is a key takeaway from '{title}'?",
                "options": {
                    "A": primary_takeaway,
                    "B": "The module excludes practical application and examples.",
                    "C": "No foundational concepts are covered in this lesson.",
                    "D": "Assessments are skipped for this learning path.",
                },
                "correct_answer": "A",
                "explanation": "This option matches one of the listed module takeaways.",
            },
            {
                "question_text": "What is required to clear a module and unlock the next one?",
                "options": {
                    "A": "Skip the quiz and continue directly",
                    "B": "Pass the module quiz with at least 60%",
                    "C": "Complete only the final assessment",
                    "D": "Request manual approval from admin",
                },
                "correct_answer": "B",
                "explanation": "Course progression requires passing each module quiz with 60% or higher.",
            },
        ]

    async def _create_default_quiz_for_module(self, module: CourseModule) -> None:
        for payload in self._build_default_quiz_payloads(module):
            self.db.add(ModuleQuiz(module_id=module.id, **payload))

    def _build_default_video_url(self, course: Course, module: CourseModule) -> str:
        if module.title in MODULE_VIDEO_FALLBACKS:
            return MODULE_VIDEO_FALLBACKS[module.title]
        if course.title in COURSE_VIDEO_FALLBACKS:
            return COURSE_VIDEO_FALLBACKS[course.title]

        title_text = f"{course.title} {module.title}".lower()
        if any(term in title_text for term in ["ai", "prompt"]):
            return "https://www.youtube.com/watch?v=2ePf9rue1Ao"
        if any(term in title_text for term in ["cloud", "aws", "infrastructure"]):
            return "https://www.youtube.com/watch?v=M988_fsOSWo"
        if any(term in title_text for term in ["python", "pandas", "dashboards", "data"]):
            return "https://www.youtube.com/watch?v=vmEHCJofslg"
        if any(term in title_text for term in ["research", "literature", "methodology"]):
            return "https://www.youtube.com/watch?v=b3VgC2WlNUQ"
        if any(term in title_text for term in ["teaching", "classroom", "learning"]):
            return "https://www.youtube.com/watch?v=R2hb_BT-MxM"
        return "https://www.youtube.com/watch?v=hfIUstzHs9A"

    def _needs_video_backfill(self, video_url: Optional[str]) -> bool:
        normalized = (video_url or "").strip().lower()
        return not normalized or "example.com" in normalized

    async def _ensure_media_for_course_modules(self, course: Course) -> bool:
        updated = False
        for module in course.modules:
            if self._needs_video_backfill(module.video_url):
                module.video_url = self._build_default_video_url(course, module)
                if not module.video_duration_seconds or module.video_duration_seconds <= 0:
                    module.video_duration_seconds = 900
                updated = True
        if updated:
            await self.db.commit()
        return updated

    async def _ensure_quizzes_for_course_modules(self, modules: List[CourseModule]) -> bool:
        created = False
        for module in modules:
            if module.quiz_questions:
                continue
            await self._create_default_quiz_for_module(module)
            created = True

        if created:
            await self.db.commit()
        return created

    # ── Courses ──────────────────────────────────────────────────────────────

    async def get_courses(self, published_only: bool = True) -> List[Course]:
        q = select(Course).options(selectinload(Course.modules))
        if published_only:
            q = q.where(Course.is_published == True)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def get_course(self, course_id: str) -> Optional[Course]:
        result = await self.db.execute(
            select(Course)
            .where(Course.id == course_id)
            .options(
                selectinload(Course.modules).selectinload(CourseModule.quiz_questions),
                selectinload(Course.assessment_questions)
            )
        )
        course = result.scalar_one_or_none()
        if not course:
            return None

        media_updated = await self._ensure_media_for_course_modules(course)
        # Backfill missing module quizzes so all modules have quiz access.
        quizzes_created = await self._ensure_quizzes_for_course_modules(course.modules)
        if not (media_updated or quizzes_created):
            return course

        refreshed = await self.db.execute(
            select(Course)
            .where(Course.id == course_id)
            .options(
                selectinload(Course.modules).selectinload(CourseModule.quiz_questions),
                selectinload(Course.assessment_questions)
            )
        )
        return refreshed.scalar_one_or_none()

    async def create_course(self, data: dict, creator_id: str) -> Course:
        course = Course(**data, created_by_id=creator_id)
        self.db.add(course)
        await self.db.commit()
        await self.db.refresh(course)
        return course

    async def update_course(self, course: Course, data: dict) -> Course:
        for k, v in data.items():
            if v is not None:
                setattr(course, k, v)
        await self.db.commit()
        await self.db.refresh(course)
        return course

    async def delete_course(self, course: Course):
        await self.db.delete(course)
        await self.db.commit()

    # ── Modules ───────────────────────────────────────────────────────────────

    async def add_module(self, course_id: str, data: dict) -> CourseModule:
        course = await self.get_course(course_id)
        if not course:
            raise ValueError("Course not found")

        module = CourseModule(**data, course_id=course_id)
        if self._needs_video_backfill(module.video_url):
            module.video_url = self._build_default_video_url(course, module)
        if not module.video_duration_seconds or module.video_duration_seconds <= 0:
            module.video_duration_seconds = 900
        self.db.add(module)
        await self.db.flush()
        await self._create_default_quiz_for_module(module)
        await self.db.commit()
        refreshed = await self.get_module(module.id)
        return refreshed if refreshed else module

    async def get_module(self, module_id: str) -> Optional[CourseModule]:
        result = await self.db.execute(
            select(CourseModule).where(CourseModule.id == module_id)
            .options(selectinload(CourseModule.quiz_questions))
        )
        return result.scalar_one_or_none()

    async def update_module(self, module: CourseModule, data: dict) -> CourseModule:
        for k, v in data.items():
            if v is not None:
                setattr(module, k, v)
        if self._needs_video_backfill(module.video_url):
            course_result = await self.db.execute(select(Course).where(Course.id == module.course_id))
            course = course_result.scalar_one_or_none()
            if course:
                module.video_url = self._build_default_video_url(course, module)
        if not module.video_duration_seconds or module.video_duration_seconds <= 0:
            module.video_duration_seconds = 900
        await self.db.commit()
        await self.db.refresh(module)
        return module

    async def delete_module(self, module: CourseModule):
        await self.db.delete(module)
        await self.db.commit()

    async def add_quiz_question(self, module_id: str, data: dict) -> ModuleQuiz:
        q = ModuleQuiz(**data, module_id=module_id)
        self.db.add(q)
        await self.db.commit()
        await self.db.refresh(q)
        return q

    async def delete_quiz_question(self, quiz_id: str):
        result = await self.db.execute(select(ModuleQuiz).where(ModuleQuiz.id == quiz_id))
        q = result.scalar_one_or_none()
        if q:
            await self.db.delete(q)
            await self.db.commit()

    async def get_quiz_question(self, quiz_id: str) -> Optional[ModuleQuiz]:
        result = await self.db.execute(select(ModuleQuiz).where(ModuleQuiz.id == quiz_id))
        return result.scalar_one_or_none()

    async def update_quiz_question(self, quiz: ModuleQuiz, data: dict) -> ModuleQuiz:
        for k, v in data.items():
            if v is not None:
                setattr(quiz, k, v)
        await self.db.commit()
        await self.db.refresh(quiz)
        return quiz

    # ── Assessment Questions ──────────────────────────────────────────────────

    async def add_assessment_question(self, course_id: str, data: dict) -> CourseAssessmentQuestion:
        q = CourseAssessmentQuestion(**data, course_id=course_id)
        self.db.add(q)
        await self.db.commit()
        await self.db.refresh(q)
        return q

    async def delete_assessment_question(self, question_id: str):
        result = await self.db.execute(
            select(CourseAssessmentQuestion).where(CourseAssessmentQuestion.id == question_id)
        )
        q = result.scalar_one_or_none()
        if q:
            await self.db.delete(q)
            await self.db.commit()

    async def get_assessment_question(self, question_id: str) -> Optional[CourseAssessmentQuestion]:
        result = await self.db.execute(
            select(CourseAssessmentQuestion).where(CourseAssessmentQuestion.id == question_id)
        )
        return result.scalar_one_or_none()

    async def update_assessment_question(
        self,
        question: CourseAssessmentQuestion,
        data: dict,
    ) -> CourseAssessmentQuestion:
        for k, v in data.items():
            if v is not None:
                setattr(question, k, v)
        await self.db.commit()
        await self.db.refresh(question)
        return question

    async def get_admin_assessment_questions(self, course_id: str) -> List[CourseAssessmentQuestion]:
        result = await self.db.execute(
            select(CourseAssessmentQuestion).where(CourseAssessmentQuestion.course_id == course_id)
        )
        return result.scalars().all()

    # ── Enrollment ────────────────────────────────────────────────────────────

    async def get_enrollment(self, faculty_id: str, course_id: str) -> Optional[CourseEnrollment]:
        result = await self.db.execute(
            select(CourseEnrollment)
            .where(CourseEnrollment.faculty_id == faculty_id, CourseEnrollment.course_id == course_id)
        )
        return result.scalar_one_or_none()

    async def enroll(self, faculty_id: str, course_id: str) -> CourseEnrollment:
        enrollment = CourseEnrollment(faculty_id=faculty_id, course_id=course_id)
        self.db.add(enrollment)
        await self.db.commit()
        result = await self.db.execute(
            select(CourseEnrollment)
            .where(CourseEnrollment.id == enrollment.id)
            .options(
                selectinload(CourseEnrollment.course)
                .selectinload(Course.modules)
                .selectinload(CourseModule.quiz_questions)
            )
        )
        return result.scalar_one()

    async def get_my_enrollments(self, faculty_id: str) -> List[CourseEnrollment]:
        result = await self.db.execute(
            select(CourseEnrollment)
            .where(CourseEnrollment.faculty_id == faculty_id)
            .options(
                selectinload(CourseEnrollment.course)
                .selectinload(Course.modules)
                .selectinload(CourseModule.quiz_questions)
            )
        )
        return result.scalars().all()

    # ── Progress ─────────────────────────────────────────────────────────────

    async def get_lesson_progress(self, faculty_id: str, module_id: str) -> Optional[LessonProgress]:
        result = await self.db.execute(
            select(LessonProgress)
            .where(LessonProgress.faculty_id == faculty_id, LessonProgress.module_id == module_id)
        )
        return result.scalar_one_or_none()

    async def upsert_lesson_progress(self, faculty_id: str, module_id: str, watched_seconds: int, completed: bool) -> LessonProgress:
        progress = await self.get_lesson_progress(faculty_id, module_id)
        if not progress:
            progress = LessonProgress(faculty_id=faculty_id, module_id=module_id)
            self.db.add(progress)
        progress.watched_seconds = max(progress.watched_seconds, watched_seconds)
        if completed and not progress.completed:
            progress.completed = True
            progress.completed_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(progress)
        return progress

    async def submit_quiz(self, faculty_id: str, module_id: str, answers: Dict[str, str]) -> LessonProgress:
        """Score the mini quiz and update lesson progress."""
        # Fetch quiz questions for this module
        result = await self.db.execute(
            select(ModuleQuiz).where(ModuleQuiz.module_id == module_id)
        )
        questions = result.scalars().all()

        # Safety backfill for legacy modules with zero quiz rows.
        if not questions:
            module = await self.get_module(module_id)
            if module:
                await self._create_default_quiz_for_module(module)
                await self.db.commit()
                refreshed = await self.db.execute(
                    select(ModuleQuiz).where(ModuleQuiz.module_id == module_id)
                )
                questions = refreshed.scalars().all()

        correct = sum(1 for q in questions if answers.get(q.id) == q.correct_answer)
        score = (correct / len(questions) * 100) if questions else 0

        progress = await self.get_lesson_progress(faculty_id, module_id)
        if not progress:
            progress = LessonProgress(faculty_id=faculty_id, module_id=module_id)
            self.db.add(progress)
        progress.quiz_score = score
        progress.quiz_passed = score >= 60
        await self.db.commit()
        await self.db.refresh(progress)
        return progress

    async def get_course_progress(self, faculty_id: str, course_id: str) -> Dict[str, Any]:
        """Return per-course progress summary."""
        course = await self.get_course(course_id)
        if not course:
            return {}
        total_modules = len(course.modules)
        if total_modules == 0:
            return {"total_modules": 0, "completed_modules": 0, "progress_pct": 0.0}

        module_ids = [m.id for m in course.modules]
        result = await self.db.execute(
            select(LessonProgress)
            .where(LessonProgress.faculty_id == faculty_id, LessonProgress.module_id.in_(module_ids))
        )
        progresses = result.scalars().all()
        progress_map = {p.module_id: p for p in progresses}
        completed = sum(1 for p in progresses if p.completed)
        quiz_scores = [p.quiz_score for p in progresses if p.quiz_score is not None]
        avg_quiz = sum(quiz_scores) / len(quiz_scores) if quiz_scores else None
        module_progress = []
        for module in course.modules:
            p = progress_map.get(module.id)
            module_progress.append(
                {
                    "module_id": module.id,
                    "completed": bool(p.completed) if p else False,
                    "quiz_score": round(p.quiz_score, 1) if p and p.quiz_score is not None else None,
                    "quiz_passed": bool(p.quiz_passed) if p else False,
                }
            )

        return {
            "total_modules": total_modules,
            "completed_modules": completed,
            "progress_pct": round(completed / total_modules * 100, 1),
            "avg_quiz_score": round(avg_quiz, 1) if avg_quiz is not None else None,
            "all_done": completed == total_modules,
            "module_progress": module_progress,
        }

    async def get_assessment_questions(self, course_id: str) -> List[Dict[str, Any]]:
        """Return assessment question set; fallback to module quiz questions when needed."""
        result = await self.db.execute(
            select(CourseAssessmentQuestion).where(CourseAssessmentQuestion.course_id == course_id)
        )
        assessment_questions = result.scalars().all()
        if assessment_questions:
            return [
                {
                    "id": q.id,
                    "course_id": q.course_id,
                    "question_text": q.question_text,
                    "options": q.options,
                    "correct_answer": q.correct_answer,
                }
                for q in assessment_questions
            ]

        module_ids_res = await self.db.execute(
            select(CourseModule.id).where(CourseModule.course_id == course_id)
        )
        module_ids = module_ids_res.scalars().all()
        if not module_ids:
            return []

        quiz_res = await self.db.execute(
            select(ModuleQuiz).where(ModuleQuiz.module_id.in_(module_ids))
        )
        module_quiz_questions = quiz_res.scalars().all()
        return [
            {
                "id": q.id,
                "course_id": course_id,
                "question_text": q.question_text,
                "options": q.options,
                "correct_answer": q.correct_answer,
            }
            for q in module_quiz_questions
        ]

    # ── Assessment ────────────────────────────────────────────────────────────

    async def submit_assessment(
        self,
        faculty_id: str,
        course_id: str,
        answers: Dict[str, str],
        time_taken_seconds: int,
        pass_percent: float = 60.0
    ) -> Tuple[CourseAttempt, List[str]]:
        question_bank = await self.get_assessment_questions(course_id)

        correct_ids: list[str] = []
        wrong_questions = []
        for q in question_bank:
            q_id = str(q["id"])
            if answers.get(q_id) == q["correct_answer"]:
                correct_ids.append(q_id)
            else:
                wrong_questions.append(q["question_text"])

        total = len(question_bank)
        correct = len(correct_ids)
        score = (correct / total * 100) if total else 0

        submitted_at = datetime.now(timezone.utc)
        safe_time = max(0, int(time_taken_seconds or 0))
        started_at = submitted_at - timedelta(seconds=safe_time)

        attempt = CourseAttempt(
            faculty_id=faculty_id,
            course_id=course_id,
            score=round(score, 2),
            total_questions=total,
            correct_answers=correct,
            passed=score >= pass_percent,
            started_at=started_at,
            submitted_at=submitted_at,
        )
        self.db.add(attempt)
        await self.db.flush()

        # Mark enrollment complete if passed
        if attempt.passed:
            enrollment = await self.get_enrollment(faculty_id, course_id)
            if enrollment and not enrollment.completed_at:
                enrollment.completed_at = datetime.now(timezone.utc)
                enrollment.certificate_issued = True

        await self.db.commit()
        await self.db.refresh(attempt)
        return attempt, wrong_questions

    async def get_latest_attempt(self, faculty_id: str, course_id: str) -> Optional[CourseAttempt]:
        result = await self.db.execute(
            select(CourseAttempt)
            .where(CourseAttempt.faculty_id == faculty_id, CourseAttempt.course_id == course_id)
            .order_by(CourseAttempt.submitted_at.desc())
        )
        return result.scalars().first()

    async def save_ai_feedback(self, attempt_id: str, feedback: dict):
        result = await self.db.execute(select(CourseAttempt).where(CourseAttempt.id == attempt_id))
        attempt = result.scalar_one_or_none()
        if attempt:
            attempt.ai_feedback = feedback
            await self.db.commit()

    # ── Admin Analytics ───────────────────────────────────────────────────────

    async def get_analytics(self) -> List[Dict[str, Any]]:
        courses = await self.get_courses(published_only=False)
        analytics = []
        for course in courses:
            enrollments_res = await self.db.execute(
                select(CourseEnrollment).where(CourseEnrollment.course_id == course.id)
            )
            enrollments = enrollments_res.scalars().all()
            total_enrolled = len(enrollments)
            total_completed = sum(1 for e in enrollments if e.completed_at is not None)

            attempts_res = await self.db.execute(
                select(CourseAttempt).where(CourseAttempt.course_id == course.id, CourseAttempt.submitted_at != None)
            )
            attempts = attempts_res.scalars().all()
            avg_score = sum(a.score for a in attempts) / len(attempts) if attempts else 0

            analytics.append({
                "course_id": course.id,
                "course_title": course.title,
                "total_enrolled": total_enrolled,
                "total_completed": total_completed,
                "completion_rate": round(total_completed / total_enrolled * 100, 1) if total_enrolled else 0,
                "average_score": round(avg_score, 1),
            })
        return analytics
