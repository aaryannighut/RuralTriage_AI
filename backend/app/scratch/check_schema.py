import sqlite3
import os

db_path = "backend/test.db"
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(patients);")
    columns = cursor.fetchall()
    for col in columns:
        print(col)
    conn.close()
