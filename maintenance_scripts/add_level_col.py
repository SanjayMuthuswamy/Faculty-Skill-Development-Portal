"""Add current_level column to roadmaps table."""
import asyncio
import logging
logging.disable(logging.CRITICAL)

async def migrate():
    from app.db.session import engine
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS current_level VARCHAR(20) NOT NULL DEFAULT 'beginner'"
        ))
    print("OK: current_level column added")
    await engine.dispose()

asyncio.run(migrate())
