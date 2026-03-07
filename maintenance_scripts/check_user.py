import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from sqlalchemy import select
from app.models.user import User
from app.models.course_enrollment import CourseEnrollment

engine = create_async_engine(settings.DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False)

async def check_user_context():
    async with SessionLocal() as session:
        # Get user
        result = await session.execute(select(User).where(User.email == "san@gmail.com"))
        user = result.scalar_one_or_none()
        
        if not user:
            print("User san@gmail.com not found")
            return
            
        print(f"USER: {user.name} | ID: {user.id} | ROLE: {user.role}")
        
        # Get enrollments
        result = await session.execute(select(CourseEnrollment).where(CourseEnrollment.faculty_id == user.id))
        enrollments = result.scalars().all()
        print(f"ENROLLMENTS: {len(enrollments)}")
        for e in enrollments:
            print(f"- Course ID: {e.course_id}")

if __name__ == "__main__":
    asyncio.run(check_user_context())
