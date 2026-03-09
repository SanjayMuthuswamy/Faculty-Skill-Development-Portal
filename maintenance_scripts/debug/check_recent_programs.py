import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta

load_dotenv('server/.env')
DATABASE_URL = "postgresql+asyncpg://postgres:123456789@127.0.0.1:5432/fsdp_db"

async def check_recent():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        ten_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=10)
        res = await conn.execute(text("SELECT id, title, created_at FROM programs WHERE created_at > :t"), {"t": ten_mins_ago})
        rows = res.all()
        print(f"Recent programs (last 10 mins): {len(rows)}")
        for r in rows:
            print(f"  - {r.title} (ID: {r.id}, Created: {r.created_at})")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_recent())
