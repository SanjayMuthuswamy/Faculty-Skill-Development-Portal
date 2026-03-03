
import sqlite3
try:
    conn = sqlite3.connect('fsdp.db')
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cur.fetchall()
    print(f"Tables found: {len(tables)}")
    for t in tables:
        cur.execute(f'SELECT count(*) FROM "{t[0]}"')
        count = cur.fetchone()[0]
        print(f"{t[0]}: {count}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
