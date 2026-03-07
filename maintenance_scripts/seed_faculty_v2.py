import asyncio
import os
import sys
from uuid import uuid4
from datetime import datetime, timedelta, timezone
import random

# Add current directory to path
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.faculty_profile import FacultyProfile
from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.attempt import Attempt
from app.models.faculty_skill import FacultySkill
from app.models.skill import Skill
from app.models.enums import Difficulty, AttemptStatus
from app.models.test import Test

FACULTY_DATA = [
    {
        "name": "Dr. Sarah Miller",
        "email": "sarah.m@example.edu",
        "dept": "Mechanical Engineering",
        "designation": "Associate Professor",
        "exp": 12,
        "skills": ["Python Programming", "Artificial Intelligence"]
    },
    {
        "name": "Prof. James Wilson",
        "email": "james.w@example.edu",
        "dept": "Electrical Engineering",
        "designation": "Professor",
        "exp": 20,
        "skills": ["Cloud Computing", "Research Methodology"]
    },
    {
        "name": "Dr. Elena Rodriguez",
        "email": "elena.r@example.edu",
        "dept": "Business Administration",
        "designation": "Assistant Professor",
        "exp": 4,
        "skills": ["Effective Communication", "Research Methodology"]
    },
    {
        "name": "Dr. Robert Chen",
        "email": "robert.c@example.edu",
        "dept": "Physics",
        "designation": "Associate Professor",
        "exp": 15,
        "skills": ["Python Programming", "Research Methodology"]
    },
    {
        "name": "Ms. Anita Desai",
        "email": "anita.d@example.edu",
        "dept": "Computer Science",
        "designation": "Lecturer",
        "exp": 3,
        "skills": ["Python Programming", "Effective Communication"]
    }
]

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # 1. Get existing courses to enroll faculty in
        result = await session.execute(select(Course))
        courses = result.scalars().all()
        if not courses:
            print("❌ No courses found to enroll faculty in. Run seed_courses.py first.")
            return

        # 2. Get existing skills
        result = await session.execute(select(Skill))
        all_skills = result.scalars().all()
        skill_map = {s.name: s.id for s in all_skills}
        
        # 3. Get existing tests
        result = await session.execute(select(Test))
        tests = result.scalars().all()
        if not tests:
            print("⚠️ No tests found. Attempts will be skipped.")

        for data in FACULTY_DATA:
            # Check if user exists
            result = await session.execute(select(User).where(User.email == data["email"]))
            user = result.scalar_one_or_none()
            
            if not user:
                user = User(
                    id=str(uuid4()),
                    email=data["email"],
                    name=data["name"],
                    password_hash=get_password_hash("password123"),
                    role=UserRole.FACULTY,
                    is_active=True
                )
                session.add(user)
                await session.flush()
                
                profile = FacultyProfile(
                    id=str(uuid4()),
                    user_id=user.id,
                    department=data["dept"],
                    designation=data["designation"],
                    experience_years=data["exp"]
                )
                session.add(profile)
                await session.flush()
                print(f"✅ Created Faculty: {data['name']} ({data['dept']})")

                # 4. Random enrollments
                num_enrolls = random.randint(2, len(courses))
                selected_courses = random.sample(courses, num_enrolls)
                for course in selected_courses:
                    enroll = CourseEnrollment(
                        id=str(uuid4()),
                        faculty_id=user.id,
                        course_id=course.id,
                        enrolled_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
                    )
                    session.add(enroll)
                print(f"   - Enrolled in {num_enrolls} courses")

                # 5. Random attempts (Practice Tests)
                if tests:
                    num_attempts = random.randint(3, 8)
                    for _ in range(num_attempts):
                        score = random.randint(60, 100)
                        total = 100
                        accuracy = float(score)
                        test = random.choice(tests)
                        attempt = Attempt(
                            id=str(uuid4()),
                            faculty_id=profile.id,
                            test_id=test.id,
                            score=score,
                            total=total,
                            accuracy=accuracy,
                            status=AttemptStatus.SUBMITTED,
                            started_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 15)),
                            submitted_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 24))
                        )
                        session.add(attempt)
                    print(f"   - Generated {num_attempts} practice attempts")

                # 6. Add skills (some verified)
                for sname in data["skills"]:
                    if sname in skill_map:
                        fskill = FacultySkill(
                            id=str(uuid4()),
                            faculty_id=profile.id,
                            skill_id=skill_map[sname],
                            level=random.randint(2, 5),
                            status=random.choice(["VERIFIED", "ASSESSMENT_DUE", "SELF_DECLARED"])
                        )
                        session.add(fskill)

        await session.commit()
    
    await engine.dispose()
    print("\n🎉 Comprehensive Faculty Seeding Completed!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
