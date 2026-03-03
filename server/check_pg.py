import asyncio
import sys
sys.path.insert(0, '.')

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def check():
    print(f"URL: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    try:
        async with engine.connect() as conn:
            # List all tables
            result = await conn.execute(text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' ORDER BY table_name"
            ))
            tables = [r[0] for r in result.fetchall()]
            print(f"\nTables ({len(tables)}):", tables)

            # Check users
            if 'users' in tables:
                result = await conn.execute(text("SELECT email, role FROM users"))
                users = result.fetchall()
                print("\nUsers:")
                for u in users:
                    print(f"  {u[0]} -> role={u[1]!r}")
            else:
                print("\n⚠️  'users' table does NOT exist — run create_all!")

            # Check attempts table columns
            if 'attempts' in tables:
                result = await conn.execute(text(
                    "SELECT column_name, data_type FROM information_schema.columns "
                    "WHERE table_name='attempts' ORDER BY ordinal_position"
                ))
                cols = result.fetchall()
                print("\nattempts columns:", [(c[0], c[1]) for c in cols])
            else:
                print("\n⚠️  'attempts' table does NOT exist!")

    except Exception as e:
        print(f"\nConnection error: {type(e).__name__}: {e}")
    finally:
        await engine.dispose()

asyncio.run(check())
