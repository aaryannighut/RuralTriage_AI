import sqlite3
import os

db_path = "backend/test.db"
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE doctors ADD COLUMN notifications JSON DEFAULT '[]';")
        conn.commit()
        print("Column 'notifications' added to 'doctors' table successfully.")
    except sqlite3.OperationalError as e:
        print(f"Error adding column: {e}")
    conn.close()
