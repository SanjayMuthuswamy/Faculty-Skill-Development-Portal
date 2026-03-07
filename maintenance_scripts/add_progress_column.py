import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add current directory to path
sys.path.append(os.getcwd())
from app.core.config import settings

async def update_schema():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        print("🚀 Updating course_enrollments schema...")
        try:
            await conn.execute(text("ALTER TABLE course_enrollments ADD COLUMN progress INTEGER DEFAULT 0"))
            print("✅ Added 'progress' column.")
        except Exception as e:
            if "already exists" in str(e):
                print("ℹ️ Column 'progress' already exists.")
            else:
                print(f"❌ Error adding column: {e}")

    await engine.dispose()
    print("\n🎉 Done!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(update_schema())
