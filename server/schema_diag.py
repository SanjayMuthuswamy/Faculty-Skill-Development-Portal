
import sqlite3
conn = sqlite3.connect('fsdp.db')
cur = conn.cursor()
for table in ['tests', 'question_packs', 'questions']:
    print(f"\n--- {table} ---")
    cur.execute(f"PRAGMA table_info({table})")
    cols = cur.fetchall()
    for c in cols:
        print(c)
conn.close()
