import asyncio
from app.db.session import SessionLocal
from sqlalchemy import delete
from app.models.news_cache import NewsCache

async def clear():
    async with SessionLocal() as db:
        result = await db.execute(delete(NewsCache))
        await db.commit()
        print(f"News cache cleared — {result.rowcount} entries deleted.")

asyncio.run(clear())
