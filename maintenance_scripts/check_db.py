import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add current directory to path
sys.path.append(os.getcwd())
from app.core.config import settings

async def check_schema():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as conn:
        # Check columns of course_enrollments
        result = await conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'course_enrollments'
        """))
        print("\n--- course_enrollments columns ---")
        for row in result:
            print(row)

        # Check attempts
        result = await conn.execute(text("""
            SELECT tc.constraint_name, kcu.column_name, ccu.table_name, ccu.column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='attempts';
        """))
        print("\n--- attempts foreign keys ---")
        for row in result:
            print(row)

    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_schema())
