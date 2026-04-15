import sqlite3
import os

db_paths = [
    "c:/Users/Aaryan/OneDrive/Documents/Hackthons_Winner_Projects/RuralTriage_AI/backend/test.db",
    "c:/Users/Aaryan/OneDrive/Documents/Hackthons_Winner_Projects/RuralTriage_AI/backend/app/test.db"
]

for db_path in db_paths:
    print(f"\n--- Checking DB at: {os.path.abspath(db_path)} ---")
    if not os.path.exists(db_path):
        print(f"File not found: {db_path}")
        continue

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # List all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        print("Tables Found:", tables)
        
        # Check patients table info
        if 'patients' in tables:
            cursor.execute("PRAGMA table_info(patients)")
            columns = cursor.fetchall()
            print("Columns in 'patients':", [col[1] for col in columns])
            
            has_family_doctor = any(col[1] == 'family_doctor_id' for col in columns)
            if not has_family_doctor:
                print("ACTION: Adding missing family_doctor_id column...")
                cursor.execute("ALTER TABLE patients ADD COLUMN family_doctor_id INTEGER REFERENCES doctors(id)")
                conn.commit()
                print("SUCCESS: Column added.")
            else:
                print("STATUS: family_doctor_id column already exists.")
        # Check appointments table info
        if 'appointments' in tables:
            cursor.execute("PRAGMA table_info(appointments)")
            apt_columns = [col[1] for col in cursor.fetchall()]
            print("Columns in 'appointments':", apt_columns)
        
        conn.close()
    except Exception as e:
        print(f"Error Processing {db_path}: {e}")
