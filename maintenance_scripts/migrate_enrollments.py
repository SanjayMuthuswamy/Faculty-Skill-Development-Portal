import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add current directory to path
sys.path.append(os.getcwd())
from app.core.config import settings

async def migrate():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        print("🚀 Starting Database Migration for CourseEnrollments...")
        
        # 1. Get all current enrollments and their user linkage
        result = await conn.execute(text("SELECT id, faculty_id FROM course_enrollments"))
        enrollments = result.fetchall()
        
        if not enrollments:
            print("ℹ️ No enrollments to migrate. Just changing the constraint.")
        else:
            # 2. Update faculty_id to use profile.id instead of user.id
            for enroll_id, user_id in enrollments:
                result = await conn.execute(text("SELECT id FROM faculty_profiles WHERE user_id = :uid"), {"uid": user_id})
                profile = result.fetchone()
                if profile:
                    await conn.execute(text("UPDATE course_enrollments SET faculty_id = :pid WHERE id = :eid"), 
                                     {"pid": profile[0], "eid": enroll_id})
                    print(f"✅ Migrated enrollment {enroll_id}: User {user_id} -> Profile {profile[0]}")
                else:
                    print(f"⚠️ Could not find profile for user {user_id}. Enrollment {enroll_id} might be orphaned.")

        # 3. Drop old foreign key and add new one
        try:
            await conn.execute(text("ALTER TABLE course_enrollments DROP CONSTRAINT course_enrollments_faculty_id_fkey"))
            print("🗑️ Dropped old foreign key constraint.")
        except Exception as e:
            print(f"⚠️ Could not drop constraint (maybe already gone?): {e}")

        await conn.execute(text("ALTER TABLE course_enrollments ADD CONSTRAINT course_enrollments_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES faculty_profiles(id)"))
        print("✅ Added new foreign key constraint pointing to faculty_profiles(id).")

    await engine.dispose()
    print("\n🎉 Migration completed!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(migrate())
