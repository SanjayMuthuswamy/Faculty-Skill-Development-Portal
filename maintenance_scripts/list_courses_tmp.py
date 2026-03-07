import asyncio
import os
import sys

# Add the current directory to sys.path to allow importing 'app'
sys.path.append(os.getcwd())

import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

from app.db.session import SessionLocal
from app.models.course import Course
from app.models.test import Test
from sqlalchemy.future import select

async def check():
    session = SessionLocal()
    
    print("--- COURSES ---")
    result = await session.execute(select(Course))
    courses = result.scalars().all()
    for c in courses:
        print(f"{c.id}: {c.title}")
        
    print("\n--- TESTS ---")
    result = await session.execute(select(Test))
    tests = result.scalars().all()
    for t in tests:
        print(f"{t.id}: {t.title}")
        
    await session.close()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check())
