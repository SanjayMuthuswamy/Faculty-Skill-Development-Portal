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

REQUESTED_FACULTY = [
    {"name": "Sanjay", "email": "sanjay@fsdp.edu", "dept": "Computer Science", "designation": "Assistant Professor"},
    {"name": "Sakthi", "email": "sakthi@fsdp.edu", "dept": "Electronics", "designation": "Associate Professor"},
    {"name": "Vijay", "email": "vijay@fsdp.edu", "dept": "Mechanical Engineering", "designation": "Professor"},
    {"name": "Ramesh", "email": "ramesh@fsdp.edu", "dept": "Civil Engineering", "designation": "Assistant Professor"},
    {"name": "Suresh", "email": "suresh@fsdp.edu", "dept": "Electrical Engineering", "designation": "Lecturer"}
]

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # Get baseline data for seeding relations
        result = await session.execute(select(Course))
        courses = result.scalars().all()
        
        result = await session.execute(select(Skill))
        all_skills = result.scalars().all()
        skill_map = {s.name: s.id for s in all_skills}
        
        result = await session.execute(select(Test))
        tests = result.scalars().all()

        print("🚀 Starting Registration of Requested Faculty...")

        for data in REQUESTED_FACULTY:
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
                    experience_years=random.randint(2, 15)
                )
                session.add(profile)
                await session.flush()
                print(f"✅ Created Faculty: {data['name']} ({data['email']})")

                # Add some random activity to make the dashboard look real
                # 1. Enrollments
                if courses:
                    num_enrolls = random.randint(1, min(3, len(courses)))
                    selected_courses = random.sample(courses, num_enrolls)
                    for course in selected_courses:
                        enroll = CourseEnrollment(
                            id=str(uuid4()),
                            faculty_id=user.id,
                            course_id=course.id,
                            enrolled_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 20))
                        )
                        session.add(enroll)

                # 2. Attempts
                if tests:
                    num_attempts = random.randint(2, 5)
                    for _ in range(num_attempts):
                        score = random.randint(70, 95)
                        test = random.choice(tests)
                        attempt = Attempt(
                            id=str(uuid4()),
                            faculty_id=profile.id,
                            test_id=test.id,
                            score=score,
                            total=100,
                            accuracy=float(score),
                            status=AttemptStatus.SUBMITTED,
                            started_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 10)),
                            submitted_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 12))
                        )
                        session.add(attempt)

                # 3. Random skills
                if all_skills:
                    num_skills = random.randint(1, 3)
                    selected_skills = random.sample(all_skills, num_skills)
                    for skill in selected_skills:
                        fskill = FacultySkill(
                            id=str(uuid4()),
                            faculty_id=profile.id,
                            skill_id=skill.id,
                            level=random.randint(2, 5),
                            status=random.choice(["VERIFIED", "SELF_DECLARED"])
                        )
                        session.add(fskill)
            else:
                print(f"⏭️ Skipping {data['name']} (Already exists)")

        await session.commit()
    
    await engine.dispose()
    print("\n🎉 Seeding of Specific Faculty Completed!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
