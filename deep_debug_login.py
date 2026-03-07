import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv('server/.env')
DATABASE_URL = "postgresql+asyncpg://postgres:123456789@127.0.0.1:5432/fsdp_db"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def deep_debug():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("--- Admin User Details ---")
        res = await conn.execute(text("SELECT email, password_hash, role, is_active, name FROM users WHERE email = 'sanjay@fsdp.com'"))
        admin = res.one_or_none()
        if admin:
            print(f"Email: '{admin.email}'")
            print(f"Role: '{admin.role}'")
            print(f"Is Active: {admin.is_active}")
            print(f"Name: '{admin.name}'")
            
            # Verify password hash
            is_valid = pwd_context.verify("123456", admin.password_hash)
            print(f"Password '123456' is valid: {is_valid}")
        else:
            print("ADMIN 'sanjay@fsdp.com' NOT FOUND!")
            res_any_admin = await conn.execute(text("SELECT email FROM users WHERE role = 'ADMIN'"))
            print(f"Any other ADMINs? {res_any_admin.all()}")

    await engine.dispose()

if __name__ == "__main__":
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(deep_debug())
