import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.services.course_service import CourseService

engine = create_async_engine(settings.DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False)

async def test_api_logic():
    async with SessionLocal() as session:
        svc = CourseService(session)
        # Simulate faculty view (published_only=True)
        courses = await svc.get_courses(published_only=True)
        
        output = []
        for c in courses:
            # Replicate the logic in the router
            data = {**c.__dict__, "module_count": len(c.modules)}
            # Remove SQLAlchemy internal state
            if '_sa_instance_state' in data:
                del data['_sa_instance_state']
            output.append(data)
            
        with open("api_debug.json", "w") as f:
            json.dump(output, f, indent=2, default=str)
        print(f"Done. Simulated API output saved to server/api_debug.json. Found {len(output)} courses.")

if __name__ == "__main__":
    asyncio.run(test_api_logic())
