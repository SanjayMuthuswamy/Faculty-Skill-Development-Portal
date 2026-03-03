"""
Diagnostic script: prints all users with their stored role values.
Run with: python check_roles.py
"""
import asyncio
import sys
sys.path.insert(0, '.')

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.connect() as conn:
        result = await conn.execute(text(
            "SELECT id, email, role, is_active FROM users ORDER BY role, email"
        ))
        rows = result.fetchall()
        
        print(f"\n{'='*70}")
        print(f"{'EMAIL':<35} {'ROLE':<15} {'ACTIVE':<8} {'ID'}")
        print(f"{'='*70}")
        for row in rows:
            id_, email, role, is_active = row
            flag = " ⚠️  WRONG CASE!" if role not in ('ADMIN', 'FACULTY') else ""
            print(f"{email:<35} {repr(role):<15} {str(is_active):<8} {id_[:8]}...{flag}")
        
        print(f"\nTotal users: {len(rows)}")
        admin_count = sum(1 for r in rows if r[2] == 'ADMIN')
        faculty_count = sum(1 for r in rows if r[2] == 'FACULTY')
        bad_count = sum(1 for r in rows if r[2] not in ('ADMIN', 'FACULTY'))
        print(f"  ADMIN users:   {admin_count}")
        print(f"  FACULTY users: {faculty_count}")
        if bad_count:
            print(f"  ⚠️  BAD role values (wrong case or unknown): {bad_count}")
            print("\nFixing bad role values...")
            async with engine.begin() as fix_conn:
                await fix_conn.execute(text(
                    "UPDATE users SET role = UPPER(role) WHERE role != UPPER(role)"
                ))
            print("Fixed! All roles are now uppercase.")
        else:
            print("  ✅ All roles are correct uppercase values.")
        
        print(f"{'='*70}\n")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
