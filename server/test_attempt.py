"""
Simulate a POST /api/v1/attempts/ to reproduce the 500 error.
Run: python test_attempt.py
"""
import asyncio
import sys
sys.path.insert(0, '.')

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.services.attempt_service import AttemptService
from sqlalchemy import text

async def test_create_attempt():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    async with SessionLocal() as session:
        # Get a real faculty profile ID and test ID from the DB
        res = await session.execute(text(
            "SELECT fp.id, u.email FROM faculty_profiles fp "
            "JOIN users u ON u.id = fp.user_id LIMIT 1"
        ))
        faculty_row = res.fetchone()
        if not faculty_row:
            print("❌ No faculty profile found in DB!")
            return
        
        faculty_id, email = faculty_row
        print(f"\n✅ Faculty: {email}, profile id={faculty_id}")
        
        res2 = await session.execute(text("SELECT id, title FROM tests LIMIT 1"))
        test_row = res2.fetchone()
        if not test_row:
            print("❌ No tests found in DB!")
            return
        
        test_id, title = test_row
        print(f"✅ Test: '{title}', id={test_id}")
        
        print(f"\nCreating attempt: faculty_id={faculty_id}, test_id={test_id}")
        try:
            service = AttemptService(session)
            attempt = await service.start_attempt(faculty_id, test_id)
            print(f"✅ Attempt created: id={attempt.id}, status={attempt.status}")
        except Exception as e:
            print(f"❌ Error: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
    
    await engine.dispose()

asyncio.run(test_create_attempt())
