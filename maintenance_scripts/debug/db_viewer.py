#!/usr/bin/env python3
"""Database viewer - Inspect any table in the database"""

import asyncio
import sys
from tabulate import tabulate
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

async def view_table(table_class, table_name, limit=10):
    """View records from a table"""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            result = await session.execute(select(table_class).limit(limit))
            records = result.scalars().all()
            
            if not records:
                print(f"\nNo records found in {table_name}")
                return
            
            # Extract attributes from first record
            first_record = records[0]
            columns = [col for col in dir(first_record) if not col.startswith('_')]
            columns = [col for col in columns if isinstance(getattr(first_record, col), (str, int, bool, type(None), float))]
            
            # Build data rows
            data = []
            for record in records:
                row = []
                for col in columns:
                    val = getattr(record, col)
                    if isinstance(val, str) and len(val) > 50:
                        val = val[:47] + "..."
                    row.append(val)
                data.append(row)
            
            print(f"\n{'='*120}")
            print(f"TABLE: {table_name.upper()} ({len(records)} records shown)")
            print(f"{'='*120}")
            print(tabulate(data, headers=columns, tablefmt="grid"))
            
    finally:
        await engine.dispose()

async def main():
    tables = {
        '1': (User, 'users'),
        '2': (Program, 'programs'),
        '3': (Enrollment, 'enrollments'),
        '4': (Course, 'courses'),
        '5': (CourseEnrollment, 'course_enrollments'),
        '6': (FacultyProfile, 'faculty_profiles'),
    }
    
    print("\n" + "="*60)
    print("DATABASE TABLE VIEWER".center(60))
    print("="*60)
    print("\nAvailable tables:")
    for key, (_, name) in tables.items():
        print(f"  {key}. {name}")
    print("  0. Exit")
    
    while True:
        choice = input("\nSelect table to view (0-6): ").strip()
        
        if choice == '0':
            print("Exiting...")
            break
        
        if choice not in tables:
            print("Invalid choice!")
            continue
        
        try:
            limit = int(input("How many records? (default 10): ") or "10")
        except ValueError:
            limit = 10
        
        table_class, table_name = tables[choice]
        await view_table(table_class, table_name, limit)
        
        again = input("\nView another table? (y/n): ").strip().lower()
        if again != 'y':
            break

if __name__ == "__main__":
    asyncio.run(main())
