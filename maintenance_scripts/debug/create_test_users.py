#!/usr/bin/env python3
"""Create default test users for seeding dashboard"""

import asyncio
import sys
import os
from uuid import uuid4
from datetime import datetime

sys.path.append(os.getcwd())

asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.faculty_profile import FacultyProfile

async def create_test_users():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            # Check if users exist
            admin_check = await session.execute(select(User).where(User.email == "admin@fsdp.com"))
            admin_exists = admin_check.scalar_one_or_none()
            
            faculty_check = await session.execute(select(User).where(User.email == "faculty@fsdp.com"))
            faculty_exists = faculty_check.scalar_one_or_none()
            
            if not admin_exists:
                print("Creating admin user...")
                admin = User(
                    id=str(uuid4()),
                    email="admin@fsdp.com",
                    hashed_password=get_password_hash("123456"),
                    name="Admin User",
                    role=UserRole.ADMIN,
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                session.add(admin)
                print("  Admin user created")
            else:
                print("Admin user already exists")
            
            if not faculty_exists:
                print("Creating faculty user...")
                faculty_id = str(uuid4())
                faculty = User(
                    id=faculty_id,
                    email="faculty@fsdp.com",
                    hashed_password=get_password_hash("123456"),
                    name="Test Faculty",
                    role=UserRole.FACULTY,
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                session.add(faculty)
                
                # Create faculty profile
                profile = FacultyProfile(
                    id=str(uuid4()),
                    user_id=faculty_id,
                    department="Computer Science",
                    designation="Assistant Professor",
                    experience_years=5,
                    created_at=datetime.utcnow()
                )
                session.add(profile)
                print("  Faculty user and profile created")
            else:
                print("Faculty user already exists")
            
            await session.commit()
            print("\nUsers created successfully!")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_test_users())
