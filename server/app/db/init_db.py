"""Database initialization module."""

import asyncio
import logging
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.session import async_session_maker, engine
from app.models.user import User, UserRole
from app.db.base import Base

logger = logging.getLogger(__name__)


async def init_db() -> None:
    """Initialize database with tables and seed data."""
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")

    async with async_session_maker() as session:
        # Check if admin user exists
        admin_result = await session.execute(select(User).where(User.email == "admin@fsdp.com"))
        admin_user = admin_result.scalar_one_or_none()

        if admin_user is None:
            admin = User(
                id=str(uuid4()),
                name="Admin User",
                email="admin@fsdp.com",
                password_hash=hash_password("Admin@123"),
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
                password_hash=hash_password("Faculty@123"),
                role=UserRole.FACULTY,
                is_active=True,
            )
            session.add(faculty)
            logger.info("Created faculty user: faculty@fsdp.com / Faculty@123")

        await session.commit()
        logger.info("Database initialization completed")


def init_db_command() -> None:
    """Command to initialize the database."""
    asyncio.run(init_db())
