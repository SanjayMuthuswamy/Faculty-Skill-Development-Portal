
import asyncio
import os
import sys

# Windows loop fix
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

print("Importing all models...")
try:
    import app.models
    print("Models imported successfully!")
except Exception as e:
    print(f"Error during model import: {e}")
    import traceback
    traceback.print_exc()
