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

        # Add some initial skills
        skill_result = await session.execute(select(Skill).limit(1))
        if not skill_result.scalar_one_or_none():
            skills = [
                Skill(id=str(uuid4()), name="Python", domain=SkillDomain.TECHNOLOGY),
                Skill(id=str(uuid4()), name="FastAPI", domain=SkillDomain.TECHNOLOGY),
                Skill(id=str(uuid4()), name="Leadership", domain=SkillDomain.LEADERSHIP)
            ]
            session.add_all(skills)
            logger.info("Created initial skills")

        await session.commit()
        logger.info("Database initialization completed")


def init_db_command() -> None:
    """Command to initialize the database."""
    asyncio.run(init_db())
