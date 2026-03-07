import asyncio
import os
import sys
from uuid import uuid4
from datetime import datetime, timedelta, timezone
import random
from sqlalchemy.exc import IntegrityError

# Add current directory to path
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import Integer

from app.core.config import settings
from app.models.user import User, UserRole
from app.models.faculty_profile import FacultyProfile
from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.attempt import Attempt
from app.models.test import Test
from app.models.enums import AttemptStatus

def log_to_file(msg):
    with open("enrichment.log", "a", encoding="utf-8") as f:
        f.write(f"{datetime.now()} - {msg}\n")
    print(msg)

async def enrich():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    if os.path.exists("enrichment.log"):
        os.remove("enrichment.log")

    async with async_session() as session:
        # Get all faculty profiles
        result = await session.execute(
            select(FacultyProfile).options(
                selectinload(FacultyProfile.course_enrollments),
                selectinload(FacultyProfile.attempts)
            )
        )
        profiles = result.scalars().all()
        
        # Get courses and tests
        result = await session.execute(select(Course))
        courses = result.scalars().all()
        
        result = await session.execute(select(Test))
        tests = result.scalars().all()

        if not courses or not tests:
            log_to_file("❌ No courses or tests found. Run baseline seeders first.")
            return

        log_to_file(f"🚀 Enriching {len(profiles)} Faculty Profiles...")

        for profile in profiles:
            log_to_file(f"\nProcessing Profile: {profile.id} (User: {profile.user_id})")
            
            # 1. Add enrollments
            if len(profile.course_enrollments) < 1:
                num_to_add = random.randint(1, 4)
                # selected_courses = random.sample(courses, min(num_to_add, len(courses)))
                # Just use the first few courses if there are many, or random sample
                indices = random.sample(range(len(courses)), min(num_to_add, len(courses)))
                for idx in indices:
                    course = courses[idx]
                    log_to_file(f"  Enrolling in Course: {course.id}")
                    enroll = CourseEnrollment(
                        id=str(uuid4()),
                        faculty_id=profile.user_id,
                        course_id=course.id,
                        enrolled_at=datetime.now(timezone.utc) - timedelta(days=random.randint(5, 30)),
                        progress=random.randint(20, 100)
                    )
                    session.add(enroll)

            # 2. Add attempts
            if len(profile.attempts) < 3:
                num_to_add = random.randint(4, 10)
                indices = random.sample(range(len(tests)), min(num_to_add, len(tests)))
                for idx in indices:
                    test = tests[idx]
                    log_to_file(f"  Adding Attempt for Test: {test.id}")
                    score = random.randint(65, 96)
                    attempt = Attempt(
                        id=str(uuid4()),
                        faculty_id=profile.id,
                        test_id=test.id,
                        score=score,
                        total=100,
                        accuracy=float(score),
                        status=AttemptStatus.SUBMITTED,
                        started_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 15)),
                        submitted_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 24))
                    )
                    session.add(attempt)

            try:
                await session.flush()
                log_to_file(f"  ✅ Flush successful for {profile.id}")
            except IntegrityError as e:
                log_to_file(f"  ❌ IntegrityError for profile {profile.id}: {str(e)}")
                # We can't rollback just one profile in a shared session easily without subtransactions
                # but flush failure might be recoverable if we just don't commit it?
                # Actually, flush failure marks the session as failed.
                raise e # Let it crash so we see the log
            except Exception as e:
                log_to_file(f"  ❌ Error for profile {profile.id}: {str(e)}")
                raise e

        await session.commit()
        log_to_file("\n🎉 All Faculty Profiles enriched with mock data!")

    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(enrich())
