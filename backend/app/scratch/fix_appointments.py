import sqlite3
import os

db_path = "backend/test.db"
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("UPDATE appointments SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;")
    conn.commit()
    print(f"Updated {cursor.rowcount} rows")
    conn.close()
