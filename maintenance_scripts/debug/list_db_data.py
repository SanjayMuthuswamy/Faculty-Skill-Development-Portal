#!/usr/bin/env python3
"""Quick database viewer - Display all tables"""

import asyncio
import sys
sys.path.append('.')

asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.core.config import settings
from app.models.user import User
from app.models.program import Program
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            # USERS
            print("\n" + "="*120)
            print("USERS TABLE")
            print("="*120)
            users = (await session.execute(select(User))).scalars().all()
            print(f"Total: {len(users)} users\n")
            for user in users:
                print(f"  {user.email:<30} | Role: {str(user.role):<10} | Name: {user.name}")
            
            # PROGRAMS
            print("\n" + "="*120)
            print("PROGRAMS TABLE")
            print("="*120)
            programs = (await session.execute(select(Program))).scalars().all()
            print(f"Total: {len(programs)} programs\n")
            for prog in programs:
                print(f"  {prog.title:<35} | Domain: {str(prog.domain):<20} | Seats: {prog.seats} | Status: {prog.status}")
            
            # ENROLLMENTS
            print("\n" + "="*120)
            print("ENROLLMENTS TABLE")
            print("="*120)
            enrollments = (await session.execute(select(Enrollment))).scalars().all()
            print(f"Total: {len(enrollments)} enrollments\n")
            for i, enr in enumerate(enrollments[:10]):
                status_str = str(enr.status) if hasattr(enr, 'status') else 'N/A'
                print(f"  {i+1}. Status: {status_str}")
            if len(enrollments) > 10:
                print(f"\n  ... and {len(enrollments) - 10} more")
            
            # COURSES
            print("\n" + "="*120)
            print("COURSES TABLE")
            print("="*120)
            courses = (await session.execute(select(Course))).scalars().all()
            print(f"Total: {len(courses)} courses\n")
            for course in courses[:15]:
                print(f"  {course.title:<40} | Level: {course.skill_level:<10} | Modules: {course.module_count}")
            if len(courses) > 15:
                print(f"\n  ... and {len(courses) - 15} more")
            
            # COURSE ENROLLMENTS
            print("\n" + "="*120)
            print("COURSE ENROLLMENTS TABLE")
            print("="*120)
            course_enr = (await session.execute(select(CourseEnrollment))).scalars().all()
            print(f"Total: {len(course_enr)} course enrollments\n")
            for i, ce in enumerate(course_enr[:10]):
                progress = ce.progress if hasattr(ce, 'progress') else 0
                print(f"  {i+1}. Progress: {progress}%")
            if len(course_enr) > 10:
                print(f"\n  ... and {len(course_enr) - 10} more")
                
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
