import asyncio
import os
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from datetime import datetime
from uuid import uuid4
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import get_password_hash
import app.models as models
from app.models.user import User, UserRole
from app.models.faculty_profile import FacultyProfile
from app.models.skill import Skill, SkillDomain
from app.models.enums import Difficulty, QuestionOption
from app.models.question_pack import QuestionPack
from app.models.question import Question
from app.models.test import Test
from app.models.test_pack import TestPack
from app.models.faculty_news_preferences import FacultyNewsPreferences

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # 1. Create Admin User
        admin_email = "sanjay@fsdp.com"
        result = await session.execute(select(User).where(User.email == admin_email))
        admin = result.scalar_one_or_none()
        
        if not admin:
            admin = User(
                id=str(uuid4()),
                email=admin_email,
                name="Sanjay",
                password_hash=get_password_hash("123456"),
                role=UserRole.ADMIN,
                is_active=True
            )
            session.add(admin)
            print(f"Created admin user: {admin_email}")

        # 2. Create Faculty User
        faculty_email = "faculty@fsdp.com"
        result = await session.execute(select(User).where(User.email == faculty_email))
        faculty_user = result.scalar_one_or_none()
        
        if not faculty_user:
            faculty_user = User(
                id=str(uuid4()),
                email=faculty_email,
                name="Faculty User",
                password_hash=get_password_hash("123456"),
                role=UserRole.FACULTY,
                is_active=True
            )
            session.add(faculty_user)
            await session.flush()
            
            profile = FacultyProfile(
                id=str(uuid4()),
                user_id=faculty_user.id,
                department="Computer Science",
                designation="Assistant Professor",
                experience_years=5
            )
            session.add(profile)
            
            news_prefs = FacultyNewsPreferences(
                faculty_id=profile.id,
                topics=["AI", "Cloud Computing", "Cybersecurity"]
            )
            session.add(news_prefs)
            
            print(f"Created faculty user and news preferences: {faculty_email}")

        # 3. Create Skills
        skills_to_create = [
            ("Python Programming", SkillDomain.TECHNOLOGY),
            ("Artificial Intelligence", SkillDomain.AI),
            ("Cloud Computing", SkillDomain.CLOUD),
            ("Research Methodology", SkillDomain.RESEARCH),
            ("Effective Communication", SkillDomain.COMMUNICATION)
        ]
        
        for name, domain in skills_to_create:
            result = await session.execute(select(Skill).where(Skill.name == name))
            if not result.scalar_one_or_none():
                skill = Skill(id=str(uuid4()), name=name, domain=domain)
                session.add(skill)
                print(f"Created skill: {name}")

        # 4. Create a Question Pack and Test
        result = await session.execute(select(Skill).where(Skill.name == "Artificial Intelligence"))
        ai_skill = result.scalar_one_or_none()
        
        if ai_skill:
            pack_name = "AI Fundamentals"
            result = await session.execute(select(QuestionPack).where(QuestionPack.pack_name == pack_name))
            if not result.scalar_one_or_none():
                q_pack = QuestionPack(
                    id=str(uuid4()),
                    pack_name=pack_name,
                    description="Basic AI concepts and history",
                    domain=SkillDomain.AI.value,
                    difficulty=Difficulty.BEGINNER,
                    created_by_id=admin.id
                )
                session.add(q_pack)
                await session.flush()

                # Add some questions
                questions = [
                    ("What does AI stand for?", "Artificial Intelligence", "Automated Information", "Augmented Intelligence", "Advanced Integration", QuestionOption.A),
                    ("Who is known as the father of AI?", "Alan Turing", "John McCarthy", "Marvin Minsky", "Elon Musk", QuestionOption.B),
                    ("Which of the following is a subfield of AI?", "Machine Learning", "Database Management", "Web Development", "Operating Systems", QuestionOption.A)
                ]
                
                for q_text, oa, ob, oc, od, correct in questions:
                    q = Question(
                        id=str(uuid4()),
                        pack_id=q_pack.id,
                        question_text=q_text,
                        option_a=oa,
                        option_b=ob,
                        option_c=oc,
                        option_d=od,
                        correct_option=correct,
                        explanation="Correct answer is " + oa if correct == QuestionOption.A else ob
                    )
                    session.add(q)

                # Create a Test
                test = Test(
                    id=str(uuid4()),
                    title="AI Proficiency Test",
                    description="Evaluate your core AI knowledge",
                    domain=SkillDomain.AI,
                    difficulty=Difficulty.BEGINNER,
                    total_questions=3,
                    pass_marks=2,
                    created_by_id=admin.id
                )
                session.add(test)
                await session.flush()

                # Link pack to test
                tp = TestPack(test_id=test.id, pack_id=q_pack.id)
                session.add(tp)
                print(f"Created Test: AI Proficiency Test")

        await session.commit()
    
    await engine.dispose()
    print("Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
