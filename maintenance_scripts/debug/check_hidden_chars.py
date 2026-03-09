import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv('server/.env')
DATABASE_URL = "postgresql+asyncpg://postgres:123456789@127.0.0.1:5432/fsdp_db"

async def check_hidden_chars():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Checking for hidden characters in emails:")
        res = await conn.execute(text("SELECT email FROM users"))
        for row in res.all():
            print(f"  Email: {repr(row[0])}")
    await engine.dispose()

if __name__ == "__main__":
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_hidden_chars())
