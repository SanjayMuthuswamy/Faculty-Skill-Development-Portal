#!/usr/bin/env python3
"""Simple database viewer - No extra dependencies"""

import asyncio
import sys
import json
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
from app.models.faculty_profile import FacultyProfile

async def view_users():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            result = await session.execute(select(User))
            users = result.scalars().all()
            
            print(f"\n{'='*100}")
            print(f"USERS TABLE ({len(users)} records)".center(100))
            print(f"{'='*100}")
            print(f"{'ID':<37} | {'EMAIL':<30} | {'NAME':<20} | {'ROLE':<10} | {'ACTIVE':<7}")
            print("-" * 100)
            
            for user in users:
                print(f"{user.id:<37} | {user.email:<30} | {user.name:<20} | {str(user.role):<10} | {str(user.is_active):<7}")
                
    finally:
        await engine.dispose()

async def view_programs():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            result = await session.execute(select(Program))
            programs = result.scalars().all()
            
            print(f"\n{'='*130}")
            print(f"PROGRAMS TABLE ({len(programs)} records)".center(130))
            print(f"{'='*130}")
            print(f"{'TITLE':<30} | {'DOMAIN':<20} | {'SEATS':<8} | {'STATUS':<10} | {'CREATED_AT':<19}")
            print("-" * 130)
            
            for prog in programs:
                created = str(prog.created_at)[:19] if prog.created_at else "N/A"
                print(f"{prog.title:<30} | {str(prog.domain):<20} | {prog.seats:<8} | {str(prog.status):<10} | {created:<19}")
                
    finally:
        await engine.dispose()

async def view_enrollments():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            result = await session.execute(select(Enrollment))
            enrollments = result.scalars().all()
            
            print(f"\n{'='*110}")
            print(f"ENROLLMENTS TABLE ({len(enrollments)} records)".center(110))
            print(f"{'='*110}")
            print(f"{'ID':<37} | {'FACULTY_ID':<37} | {'PROGRAM_ID':<37} | {'STATUS':<12}")
            print("-" * 110)
            
            for enr in enrollments:
                fac_id = enr.faculty_id[:20] + ".." if enr.faculty_id else "N/A"
                prog_id = enr.program_id[:20] + ".." if enr.program_id else "N/A"
                print(f"{enr.id:<37} | {fac_id:<37} | {prog_id:<37} | {str(enr.status):<12}")
                
    finally:
        await engine.dispose()

async def view_courses():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            result = await session.execute(select(Course))
            courses = result.scalars().all()
            
            print(f"\n{'='*120}")
            print(f"COURSES TABLE ({len(courses)} records)".center(120))
            print(f"{'='*120}")
            print(f"{'TITLE':<35} | {'INSTRUCTUR':<20} | {'SKILL_LEVEL':<15} | {'MODULES':<10}")
            print("-" * 120)
            
            for course in courses:
                instr = course.instructor_name[:18] if course.instructor_name else "N/A"
                print(f"{course.title:<35} | {instr:<20} | {course.skill_level:<15} | {course.module_count:<10}")
                
    finally:
        await engine.dispose()

async def view_course_enrollments():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            result = await session.execute(select(CourseEnrollment))
            enr = result.scalars().all()
            
            print(f"\n{'='*110}")
            print(f"COURSE_ENROLLMENTS TABLE ({len(enr)} records)".center(110))
            print(f"{'='*110}")
            print(f"{'ID':<37} | {'FACULTY_ID':<20} | {'COURSE_ID':<20} | {'PROGRESS':<10}")
            print("-" * 110)
            
            for ce in enr[:20]:  # Show first 20
                fac_id = ce.faculty_id[:18] if ce.faculty_id else "N/A"
                course_id = ce.course_id[:18] if ce.course_id else "N/A"
                print(f"{ce.id:<37} | {fac_id:<20} | {course_id:<20} | {ce.progress:<10}")
            
            if len(enr) > 20:
                print(f"\n... and {len(enr) - 20} more records")
                
    finally:
        await engine.dispose()

async def main():
    tables = {
        '1': ('Users', view_users),
        '2': ('Programs', view_programs),
        '3': ('Enrollments', view_enrollments),
        '4': ('Courses', view_courses),
        '5': ('Course Enrollments', view_course_enrollments),
    }
    
    print("\n" + "="*60)
    print("DATABASE VIEWER".center(60))
    print("="*60)
    print("\nAvailable tables:")
    for key, (name, _) in tables.items():
        print(f"  {key}. {name}")
    print("  0. Exit")
    print("  * (view all)")
    
    while True:
        choice = input("\nSelect table (0-5, or *): ").strip()
        
        if choice == '0':
            print("Exiting...")
            break
        
        if choice == '*':
            for _, view_func in tables.values():
                await view_func()
            continue
        
        if choice not in tables:
            print("Invalid choice!")
            continue
        
        name, view_func = tables[choice]
        await view_func()
        
        again = input("\nView another table? (y/n): ").strip().lower()
        if again != 'y':
            break

if __name__ == "__main__":
    asyncio.run(main())
