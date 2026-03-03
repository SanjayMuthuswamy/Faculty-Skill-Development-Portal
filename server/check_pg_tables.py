import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine(
        "postgresql+asyncpg://postgres:123456789@localhost:5432/fsdp_db"
    )
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
        )
        tables = result.fetchall()
        print("Tables in fsdp_db:")
        for t in tables:
            print(f"  - {t[0]}")
    await engine.dispose()

asyncio.run(check())
