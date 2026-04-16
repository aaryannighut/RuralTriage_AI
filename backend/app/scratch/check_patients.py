import sqlite3
import os

db_path = "backend/test.db"
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, user_id, name, family_doctor_id FROM patients;")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    conn.close()
