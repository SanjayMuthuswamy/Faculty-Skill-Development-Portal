"""Database initialization module."""

import asyncio
import logging
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.db.session import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.faculty_profile import FacultyProfile
from app.models.skill import Skill, SkillDomain
from app.db.base import Base

logger = logging.getLogger(__name__)


async def init_db() -> None:
    """Initialize database with tables and seed data."""
    # Create all tables (already done by Alembic, but good for safety)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified")

    async with SessionLocal() as session:
        # Check if admin user exists
        admin_result = await session.execute(select(User).where(User.email == "admin@fsdp.com"))
        admin_user = admin_result.scalar_one_or_none()

        if admin_user is None:
            admin = User(
                id=str(uuid4()),
                name="Admin User",
                email="admin@fsdp.com",
                password_hash=get_password_hash("Admin@123"),
                role=UserRole.ADMIN,
                is_active=True,
            )
            session.add(admin)
            await session.flush()
            
            # Create faculty profile for admin so they can test faculty features
            admin_profile = FacultyProfile(
                id=str(uuid4()),
                user_id=admin.id,
                department="Administration",
                designation="Administrator"
            )
            session.add(admin_profile)
            logger.info("Created admin user: admin@fsdp.com / Admin@123")

        # Check if faculty user exists
        faculty_result = await session.execute(select(User).where(User.email == "faculty@fsdp.com"))
        faculty_user = faculty_result.scalar_one_or_none()

        if faculty_user is None:
            faculty = User(
                id=str(uuid4()),
                name="Faculty User",
                email="faculty@fsdp.com",
                password_hash=get_password_hash("Faculty@123"),
                role=UserRole.FACULTY,
                is_active=True,
            )
            session.add(faculty)
            await session.flush()
            
            # Create Faculty Profile
            profile = FacultyProfile(
                id=str(uuid4()),
                user_id=faculty.id,
                department="Computer Science",
                designation="Assistant Professor"
            )
            session.add(profile)
            logger.info("Created faculty user and profile: faculty@fsdp.com / Faculty@123")

        # Add some initial skills - check for specific skills to ensure idempotency
        skill_names = ["Python", "FastAPI", "Leadership"]
        existing_skills = await session.execute(
            select(Skill).where(Skill.name.in_(skill_names))
        )
        existing_skill_names = {s.name for s in existing_skills.scalars()}
        
        if len(existing_skill_names) < len(skill_names):
            new_skills = []
            if "Python" not in existing_skill_names:
                new_skills.append(Skill(id=str(uuid4()), name="Python", domain=SkillDomain.TECHNOLOGY))
            if "FastAPI" not in existing_skill_names:
                new_skills.append(Skill(id=str(uuid4()), name="FastAPI", domain=SkillDomain.TECHNOLOGY))
            if "Leadership" not in existing_skill_names:
                new_skills.append(Skill(id=str(uuid4()), name="Leadership", domain=SkillDomain.LEADERSHIP))
            
            if new_skills:
                session.add_all(new_skills)
                logger.info(f"Created initial skills: {', '.join(s.name for s in new_skills)}")

        await session.commit()
        logger.info("Database initialization completed")


def init_db_command() -> None:
    """Command to initialize the database."""
    asyncio.run(init_db())
