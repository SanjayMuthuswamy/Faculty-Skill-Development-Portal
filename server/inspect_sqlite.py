import sqlite3
conn = sqlite3.connect('fsdp.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [t[0] for t in c.fetchall()]
print('Tables:', tables)
try:
    c.execute('SELECT email, role FROM users')
    print('Users:', c.fetchall())
except Exception as e:
    print('No users table or error:', e)
conn.close()
