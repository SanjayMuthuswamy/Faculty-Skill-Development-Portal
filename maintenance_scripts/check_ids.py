import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add current directory to path
sys.path.append(os.getcwd())
from app.core.config import settings

async def check():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, user_id FROM faculty_profiles LIMIT 10"))
        rows = res.all()
        print(f"Faculty IDs in DB: {[row[0] for row in rows]}")

    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check())
