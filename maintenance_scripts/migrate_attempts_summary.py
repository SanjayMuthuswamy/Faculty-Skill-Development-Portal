"""Migration script to add summary columns to attempts table."""
import asyncio
import logging
logging.disable(logging.CRITICAL)

async def migrate():
    from app.db.session import engine
    from sqlalchemy import text
    
    async with engine.begin() as conn:
        print("Adding detailed evaluation columns to 'attempts' table...")
        
        # Check if columns already exist to avoid errors during re-runs
        table_info = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'attempts'"))
        existing_cols = {row[0] for row in table_info}
        
        cols_to_add = {
            "correct_count": "INTEGER DEFAULT 0",
            "incorrect_count": "INTEGER DEFAULT 0",
            "unanswered_count": "INTEGER DEFAULT 0",
            "time_taken_seconds": "INTEGER DEFAULT 0",
        }
        
        for col_name, col_type in cols_to_add.items():
            if col_name not in existing_cols:
                await conn.execute(text(f"ALTER TABLE attempts ADD COLUMN {col_name} {col_type}"))
                print(f"Added column: {col_name}")
            else:
                print(f"Column already exists: {col_name}")
        
    print("Migration complete.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
