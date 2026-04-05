import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.attempt import Attempt, AttemptStatus
from app.models.course import Course
from app.models.course_assessment import CourseAssessmentQuestion
from app.models.course_enrollment import CourseEnrollment
from app.models.course_module import CourseModule
from app.models.enrollment import Enrollment
from app.models.enums import Difficulty, EnrollmentStatus, ProgramStatus, QuestionOption
from app.models.faculty_news_preferences import FacultyNewsPreferences
from app.models.faculty_profile import FacultyProfile
from app.models.faculty_skill import FacultySkill, SkillStatus
from app.models.growth_plan import GrowthPlan, GrowthPlanStatus
from app.models.growth_week import GrowthWeek
from app.models.lesson_progress import LessonProgress
from app.models.module_quiz import ModuleQuiz
from app.models.performance_analysis import PerformanceAnalysis, PerformanceAnalysisStatus
from app.models.program import Program
from app.models.question import Question
from app.models.question_pack import QuestionPack
from app.models.skill import Skill, SkillDomain
from app.models.test import Test
from app.models.test_pack import TestPack
from app.models.user import User, UserRole
from app.models.week_task import WeekTask

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


async def _get_or_create_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    role: UserRole,
    name: str,
) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user:
        return user

    user = User(
        id=str(uuid4()),
        email=email,
        name=name,
        password_hash=get_password_hash(password),
        role=role,
        is_active=True,
    )
    session.add(user)
    await session.flush()
    print(f"Created {role.lower()} user: {email}")
    return user


async def _get_or_create_faculty_profile(session: AsyncSession, user: User) -> FacultyProfile:
    result = await session.execute(select(FacultyProfile).where(FacultyProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if profile:
        return profile

    profile = FacultyProfile(
        id=str(uuid4()),
        user_id=user.id,
        department="Computer Science",
        designation="Assistant Professor",
        experience_years=5,
    )
    session.add(profile)
    await session.flush()
    print(f"Created faculty profile for: {user.email}")
    return profile


async def _ensure_news_preferences(session: AsyncSession, profile: FacultyProfile) -> None:
    result = await session.execute(
        select(FacultyNewsPreferences).where(FacultyNewsPreferences.faculty_id == profile.id)
    )
    prefs = result.scalar_one_or_none()
    if prefs:
        return

    session.add(
        FacultyNewsPreferences(
            faculty_id=profile.id,
            topics=["AI", "Cloud Computing", "Cybersecurity"],
        )
    )


async def _ensure_skills(session: AsyncSession) -> dict[str, Skill]:
    catalog = [
        ("Python Programming", SkillDomain.TECHNOLOGY),
        ("Artificial Intelligence", SkillDomain.AI),
        ("Cloud Computing", SkillDomain.CLOUD),
        ("Research Methodology", SkillDomain.RESEARCH),
        ("Effective Communication", SkillDomain.COMMUNICATION),
    ]
    skills: dict[str, Skill] = {}
    for name, domain in catalog:
        result = await session.execute(select(Skill).where(Skill.name == name))
        skill = result.scalar_one_or_none()
        if not skill:
            skill = Skill(id=str(uuid4()), name=name, domain=domain)
            session.add(skill)
            await session.flush()
            print(f"Created skill: {name}")
        skills[name] = skill
    return skills


async def _ensure_faculty_skill_links(
    session: AsyncSession,
    profile: FacultyProfile,
    skills: dict[str, Skill],
) -> None:
    desired = [
        ("Python Programming", 4, SkillStatus.VERIFIED),
        ("Artificial Intelligence", 3, SkillStatus.VERIFIED),
        ("Effective Communication", 4, SkillStatus.UNVERIFIED),
    ]
    for skill_name, level, status in desired:
        skill = skills[skill_name]
        result = await session.execute(
            select(FacultySkill).where(
                FacultySkill.faculty_id == profile.id,
                FacultySkill.skill_id == skill.id,
            )
        )
        link = result.scalar_one_or_none()
        if link:
            continue
        session.add(
            FacultySkill(
                id=str(uuid4()),
                faculty_id=profile.id,
                skill_id=skill.id,
                level=level,
                status=status,
            )
        )


async def _ensure_test_assets(session: AsyncSession, admin: User) -> Test:
    pack_name = "AI Fundamentals"
    result = await session.execute(select(QuestionPack).where(QuestionPack.pack_name == pack_name))
    pack = result.scalar_one_or_none()
    if not pack:
        pack = QuestionPack(
            id=str(uuid4()),
            pack_name=pack_name,
            description="Basic AI concepts and history",
            domain=SkillDomain.AI.value,
            difficulty=Difficulty.BEGINNER,
            created_by_id=admin.id,
        )
        session.add(pack)
        await session.flush()

        questions = [
            (
                "What does AI stand for?",
                "Artificial Intelligence",
                "Automated Information",
                "Augmented Innovation",
                "Advanced Integration",
                QuestionOption.A,
            ),
            (
                "Who is known as the father of AI?",
                "Alan Turing",
                "John McCarthy",
                "Marvin Minsky",
                "Claude Shannon",
                QuestionOption.B,
            ),
            (
                "Which of the following is a subfield of AI?",
                "Machine Learning",
                "Database Administration",
                "Web Hosting",
                "Spreadsheet Design",
                QuestionOption.A,
            ),
        ]
        for text, a, b, c, d, correct in questions:
            session.add(
                Question(
                    id=str(uuid4()),
                    pack_id=pack.id,
                    question_text=text,
                    option_a=a,
                    option_b=b,
                    option_c=c,
                    option_d=d,
                    correct_option=correct,
                    explanation=f"The correct answer is {a if correct == QuestionOption.A else b}.",
                )
            )
        print("Created AI Fundamentals question pack")

    result = await session.execute(select(Test).where(Test.title == "AI Proficiency Test"))
    test = result.scalar_one_or_none()
    if not test:
        test = Test(
            id=str(uuid4()),
            title="AI Proficiency Test",
            description="Evaluate your core AI knowledge",
            domain=SkillDomain.AI,
            difficulty=Difficulty.BEGINNER,
            total_questions=3,
            pass_marks=2,
            time_limit_minutes=20,
            created_by_id=admin.id,
        )
        session.add(test)
        await session.flush()
        session.add(TestPack(test_id=test.id, pack_id=pack.id))
        print("Created test: AI Proficiency Test")
    return test


async def _ensure_attempt_and_analysis(
    session: AsyncSession,
    faculty_profile: FacultyProfile,
    faculty_user: User,
    test: Test,
) -> None:
    result = await session.execute(
        select(Attempt).where(
            Attempt.faculty_id == faculty_profile.id,
            Attempt.test_id == test.id,
        )
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        started_at = datetime.now(timezone.utc) - timedelta(days=2, minutes=25)
        submitted_at = started_at + timedelta(minutes=18)
        attempt = Attempt(
            id=str(uuid4()),
            test_id=test.id,
            faculty_id=faculty_profile.id,
            started_at=started_at,
            submitted_at=submitted_at,
            score=2,
            total=3,
            accuracy=66.7,
            correct_count=2,
            incorrect_count=1,
            unanswered_count=0,
            time_taken_seconds=1080,
            status=AttemptStatus.SUBMITTED,
        )
        session.add(attempt)
        await session.flush()
        print("Created sample attempt for faculty dashboard")

    result = await session.execute(
        select(PerformanceAnalysis).where(PerformanceAnalysis.attempt_id == attempt.id)
    )
    analysis = result.scalar_one_or_none()
    if analysis:
        return

    session.add(
        PerformanceAnalysis(
            id=str(uuid4()),
            attempt_id=attempt.id,
            user_id=faculty_user.id,
            topic=test.title,
            difficulty=str(test.difficulty),
            percentage=attempt.accuracy,
            next_difficulty="Medium",
            strengths="Understands core AI terminology and common subfields.",
            weaknesses="Needs more work on historical foundations and applied interpretation.",
            skill_gaps=["AI history", "concept application"],
            recommendations=[
                "Revise the fundamentals chapter before the next test.",
                "Practice 10 mixed AI MCQs under time pressure.",
                "Review each incorrect answer and note the reasoning.",
            ],
            prompt_version="offline-seed",
            status=PerformanceAnalysisStatus.COMPLETED,
            raw_llm_output={"source": "seed"},
        )
    )


async def _ensure_programs(
    session: AsyncSession,
    admin: User,
    faculty_profile: FacultyProfile,
) -> None:
    now = datetime.now(timezone.utc)
    catalog = [
        {
            "title": "AI in Teaching Practice",
            "description": "A practical faculty development program for AI-assisted classroom planning.",
            "domain": SkillDomain.AI,
            "start_date": now + timedelta(days=5),
            "end_date": now + timedelta(days=35),
            "duration": "4 weeks",
            "seats": 40,
            "mode": "Hybrid",
            "topics": ["Prompting", "Assessment design", "Feedback workflows"],
            "benefits": ["Teaching efficiency", "Faster feedback cycles"],
            "status": ProgramStatus.PUBLISHED,
            "enrollment_status": EnrollmentStatus.ENROLLED,
        },
        {
            "title": "Cloud Tools for Academic Delivery",
            "description": "Use cloud collaboration and delivery tools in higher education workflows.",
            "domain": SkillDomain.CLOUD,
            "start_date": now - timedelta(days=14),
            "end_date": now + timedelta(days=14),
            "duration": "1 month",
            "seats": 30,
            "mode": "Online",
            "topics": ["Cloud storage", "Collaboration suites", "Virtual labs"],
            "benefits": ["Reliable delivery", "Better collaboration"],
            "status": ProgramStatus.ONGOING,
            "enrollment_status": EnrollmentStatus.COMPLETED,
        },
    ]

    for item in catalog:
        result = await session.execute(select(Program).where(Program.title == item["title"]))
        program = result.scalar_one_or_none()
        if not program:
            program = Program(
                id=str(uuid4()),
                title=item["title"],
                description=item["description"],
                domain=item["domain"],
                start_date=item["start_date"],
                end_date=item["end_date"],
                duration=item["duration"],
                seats=item["seats"],
                mode=item["mode"],
                topics=item["topics"],
                benefits=item["benefits"],
                status=item["status"],
                created_by_id=admin.id,
            )
            session.add(program)
            await session.flush()
            print(f"Created program: {program.title}")

        enrollment_result = await session.execute(
            select(Enrollment).where(
                Enrollment.program_id == program.id,
                Enrollment.faculty_id == faculty_profile.id,
            )
        )
        if not enrollment_result.scalar_one_or_none():
            session.add(
                Enrollment(
                    id=str(uuid4()),
                    program_id=program.id,
                    faculty_id=faculty_profile.id,
                    status=item["enrollment_status"],
                )
            )


async def _ensure_courses(
    session: AsyncSession,
    admin: User,
    faculty_user: User,
) -> None:
    course_specs = [
        {
            "title": "Modern Data Literacy for Faculty",
            "description": "Build confidence with data interpretation, dashboards, and classroom evidence.",
            "instructor_name": "Dr. Meera Raman",
            "duration_hours": 8.0,
            "skill_level": "beginner",
            "tags": ["analytics", "data literacy", "teaching"],
            "thumbnail_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80",
            "modules": [
                {
                    "title": "Reading Academic Dashboards",
                    "description": "Interpret common metrics and identify actionable trends.",
                    "seconds": 1200,
                    "takeaways": ["Metric interpretation", "Trend review", "Decision making"],
                },
                {
                    "title": "Turning Insights into Teaching Actions",
                    "description": "Use evidence to adjust lesson design and student support.",
                    "seconds": 1500,
                    "takeaways": ["Action plans", "Reflection", "Improvement loops"],
                },
            ],
            "assessment": [
                ("What is a useful first step when reading a dashboard?", {"A": "Check context and time range", "B": "Assume all metrics are stable", "C": "Ignore outliers", "D": "Skip baseline comparisons"}, "A"),
                ("Why are trend comparisons important?", {"A": "They remove all uncertainty", "B": "They show change over time", "C": "They replace qualitative insight", "D": "They guarantee performance gains"}, "B"),
            ],
        },
        {
            "title": "Applied AI Workflows for Classroom Support",
            "description": "Use AI tools for planning, feedback, and academic productivity with guardrails.",
            "instructor_name": "Prof. Anand Krishnan",
            "duration_hours": 10.0,
            "skill_level": "intermediate",
            "tags": ["ai", "productivity", "assessment"],
            "thumbnail_url": "https://images.unsplash.com/photo-1677691824304-279660ceece3?auto=format&fit=crop&w=1400&q=80",
            "modules": [
                {
                    "title": "Prompting for Teaching Tasks",
                    "description": "Design prompts for outlines, rubrics, and revision support.",
                    "seconds": 1800,
                    "takeaways": ["Prompt constraints", "Iterative refinement", "Rubric drafting"],
                },
                {
                    "title": "Responsible AI Review",
                    "description": "Validate AI output before classroom use.",
                    "seconds": 1600,
                    "takeaways": ["Verification", "Bias checks", "Faculty oversight"],
                },
            ],
            "assessment": [
                ("What should faculty do before using AI output in class?", {"A": "Publish it unchanged", "B": "Verify and adapt it", "C": "Assume accuracy", "D": "Skip rubric alignment"}, "B"),
                ("Why is iterative prompting useful?", {"A": "It prevents all hallucinations", "B": "It improves specificity and control", "C": "It removes the need for review", "D": "It guarantees originality"}, "B"),
            ],
        },
    ]

    for spec in course_specs:
        result = await session.execute(select(Course).where(Course.title == spec["title"]))
        course = result.scalar_one_or_none()
        if not course:
            course = Course(
                id=str(uuid4()),
                title=spec["title"],
                description=spec["description"],
                instructor_name=spec["instructor_name"],
                duration_hours=spec["duration_hours"],
                skill_level=spec["skill_level"],
                tags=spec["tags"],
                thumbnail_url=spec.get("thumbnail_url"),
                is_published=True,
                created_by_id=admin.id,
            )
            session.add(course)
            await session.flush()
            print(f"Created course: {course.title}")

        existing_modules = {
            module.title: module
            for module in (
                await session.execute(select(CourseModule).where(CourseModule.course_id == course.id))
            ).scalars()
        }
        for index, module_spec in enumerate(spec["modules"], start=1):
            module = existing_modules.get(module_spec["title"])
            if not module:
                module = CourseModule(
                    id=str(uuid4()),
                    course_id=course.id,
                    title=module_spec["title"],
                    description=module_spec["description"],
                    order_index=index,
                    video_url=f"https://example.com/videos/{quote_slug(course.title)}-{index}",
                    video_duration_seconds=module_spec["seconds"],
                    notes_url=f"https://example.com/notes/{quote_slug(course.title)}-{index}.pdf",
                    key_takeaways=module_spec["takeaways"],
                )
                session.add(module)
                await session.flush()

            quiz_result = await session.execute(select(ModuleQuiz).where(ModuleQuiz.module_id == module.id))
            if not quiz_result.scalar_one_or_none():
                session.add(
                    ModuleQuiz(
                        id=str(uuid4()),
                        module_id=module.id,
                        question_text=f"What is the main goal of {module.title}?",
                        options={
                            "A": f"To apply the core ideas of {module.title}",
                            "B": "To avoid all review and reflection",
                            "C": "To remove the need for faculty judgement",
                            "D": "To replace planning with guesswork",
                        },
                        correct_answer="A",
                        explanation=f"{module.title} is intended to build practical understanding.",
                    )
                )

        assessment_rows = (
            await session.execute(select(CourseAssessmentQuestion).where(CourseAssessmentQuestion.course_id == course.id))
        ).scalars().all()
        if not assessment_rows:
            for question_text, options, correct_answer in spec["assessment"]:
                session.add(
                    CourseAssessmentQuestion(
                        id=str(uuid4()),
                        course_id=course.id,
                        question_text=question_text,
                        options=options,
                        correct_answer=correct_answer,
                        explanation=f"The best answer is {correct_answer}.",
                    )
                )

        enrollment_result = await session.execute(
            select(CourseEnrollment).where(
                CourseEnrollment.faculty_id == faculty_user.id,
                CourseEnrollment.course_id == course.id,
            )
        )
        enrollment = enrollment_result.scalar_one_or_none()
        if not enrollment:
            completed_at = None
            progress = 50
            certificate_issued = False
            if spec["title"] == "Modern Data Literacy for Faculty":
                completed_at = datetime.now(timezone.utc) - timedelta(days=1)
                progress = 100
                certificate_issued = True
            enrollment = CourseEnrollment(
                id=str(uuid4()),
                faculty_id=faculty_user.id,
                course_id=course.id,
                completed_at=completed_at,
                progress=progress,
                certificate_issued=certificate_issued,
            )
            session.add(enrollment)
            await session.flush()

        modules = (
            await session.execute(
                select(CourseModule).where(CourseModule.course_id == course.id).order_by(CourseModule.order_index)
            )
        ).scalars().all()
        for idx, module in enumerate(modules):
            progress_result = await session.execute(
                select(LessonProgress).where(
                    LessonProgress.faculty_id == faculty_user.id,
                    LessonProgress.module_id == module.id,
                )
            )
            if progress_result.scalar_one_or_none():
                continue
            completed = spec["title"] == "Modern Data Literacy for Faculty" or idx == 0
            session.add(
                LessonProgress(
                    id=str(uuid4()),
                    faculty_id=faculty_user.id,
                    module_id=module.id,
                    watched_seconds=module.video_duration_seconds,
                    completed=completed,
                    quiz_score=82.0 if completed else None,
                    quiz_passed=completed,
                    completed_at=datetime.now(timezone.utc) - timedelta(hours=2) if completed else None,
                )
            )


async def _ensure_growth_plan(session: AsyncSession, faculty_profile: FacultyProfile) -> None:
    result = await session.execute(
        select(GrowthPlan).where(
            GrowthPlan.faculty_id == faculty_profile.id,
            GrowthPlan.status == GrowthPlanStatus.ACTIVE,
        )
    )
    plan = result.scalars().first()
    if not plan:
        plan = GrowthPlan(
            id=str(uuid4()),
            faculty_id=faculty_profile.id,
            domain=SkillDomain.AI,
            target_skill="Applied AI for teaching",
            current_level=2,
            target_level=5,
            weekly_hours=4,
            status=GrowthPlanStatus.ACTIVE,
            progress_percentage=25.0,
        )
        session.add(plan)
        await session.flush()
        print("Created active growth plan")

    week_rows = (
        await session.execute(select(GrowthWeek).where(GrowthWeek.plan_id == plan.id).order_by(GrowthWeek.week_number))
    ).scalars().all()
    if week_rows:
        return

    titles = [
        "Prompting fundamentals",
        "Assessment workflow design",
        "Feedback review and validation",
        "Capstone classroom integration",
    ]
    for index, title in enumerate(titles, start=1):
        week = GrowthWeek(
            id=str(uuid4()),
            plan_id=plan.id,
            week_number=index,
            title=title,
            required_practice_count=2,
            required_min_avg_score=65.0 + index * 5,
            completed=index == 1,
            completed_at=datetime.now(timezone.utc) - timedelta(days=7) if index == 1 else None,
        )
        session.add(week)
        await session.flush()
        session.add_all(
            [
                WeekTask(id=str(uuid4()), week_id=week.id, label=f"Review the key ideas for {title}", done=index == 1),
                WeekTask(id=str(uuid4()), week_id=week.id, label=f"Complete one practice task for {title}", done=False),
            ]
        )


def quote_slug(value: str) -> str:
    return (
        value.lower()
        .replace("&", "and")
        .replace(" ", "-")
        .replace("/", "-")
    )


async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        admin = await _get_or_create_user(
            session,
            email=os.getenv("SEED_ADMIN_EMAIL", "admin@example.com"),
            password=os.getenv("SEED_ADMIN_PASSWORD") or "Admin@123",
            role=UserRole.ADMIN,
            name="Portal Admin",
        )
        faculty_user = await _get_or_create_user(
            session,
            email=os.getenv("SEED_FACULTY_EMAIL", "faculty@example.com"),
            password=os.getenv("SEED_FACULTY_PASSWORD") or "Faculty@123",
            role=UserRole.FACULTY,
            name="Faculty User",
        )
        faculty_profile = await _get_or_create_faculty_profile(session, faculty_user)
        await _ensure_news_preferences(session, faculty_profile)
        skills = await _ensure_skills(session)
        await _ensure_faculty_skill_links(session, faculty_profile, skills)
        test = await _ensure_test_assets(session, admin)
        await _ensure_attempt_and_analysis(session, faculty_profile, faculty_user, test)
        await _ensure_programs(session, admin, faculty_profile)
        await _ensure_courses(session, admin, faculty_user)
        await _ensure_growth_plan(session, faculty_profile)

        await session.commit()

    await engine.dispose()
    print("Seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
