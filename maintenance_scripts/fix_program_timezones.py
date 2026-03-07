import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv
import os

load_dotenv('server/.env')
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:123456789@127.0.0.1:5432/fsdp_db")

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Altering programs table columns to include timezone...")
        await conn.execute(text("ALTER TABLE programs ALTER COLUMN start_date TYPE TIMESTAMP WITH TIME ZONE"))
        await conn.execute(text("ALTER TABLE programs ALTER COLUMN end_date TYPE TIMESTAMP WITH TIME ZONE"))
        await conn.commit()
        print("Migration complete.")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
