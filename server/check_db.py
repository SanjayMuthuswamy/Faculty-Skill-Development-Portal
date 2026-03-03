import sys
sys.path.insert(0, '.')

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def check():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT email, role, is_active FROM users ORDER BY role"))
        rows = result.fetchall()
        print("\n=== USERS IN DATABASE ===")
        for row in rows:
            email, role, active = row
            print(f"  email={email!r}  role={role!r}  active={active}")
        print(f"=========================\n")
    await engine.dispose()

asyncio.run(check())
