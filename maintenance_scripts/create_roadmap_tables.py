"""Force-create all roadmap tables in PostgreSQL."""
import asyncio
import logging
logging.basicConfig(level=logging.INFO)

async def create_tables():
    from app.db.session import engine
    from app.db.base import Base
    # Import ALL models so they register with Base.metadata
    import app.models  # noqa
    
    async with engine.begin() as conn:
        # Only create tables that don't exist yet (checkfirst=True is default)
        await conn.run_sync(Base.metadata.create_all)
    
    # Verify
    from sqlalchemy import text  
    async with engine.connect() as conn:
        result = await conn.execute(text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='public' AND table_name LIKE '%roadmap%' "
            "ORDER BY table_name"
        ))
        tables = [row[0] for row in result.fetchall()]
        print(f"\nRoadmap tables ({len(tables)}):")
        for t in tables:
            print(f"  ✓ {t}")
    
    await engine.dispose()

asyncio.run(create_tables())
