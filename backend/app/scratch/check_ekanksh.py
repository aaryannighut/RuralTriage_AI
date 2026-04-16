import sqlite3
import os

db_path = "backend/test.db"
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- Users matching 'Ekanksh' ---")
    cursor.execute("SELECT id, name, email, role FROM users WHERE name LIKE '%Ekanksh%' OR email LIKE '%ekanksh%';")
    users = cursor.fetchall()
    for u in users:
        print(f"UserID: {u[0]}, Name: {u[1]}, Email: {u[2]}, Role: {u[3]}")
    
    print("\n--- Doctors matching 'Ekanksh' ---")
    cursor.execute("SELECT id, user_id, name, specialty FROM doctors WHERE name LIKE '%Ekanksh%';")
    doctors = cursor.fetchall()
    for d in doctors:
        print(f"DoctorID: {d[0]}, UserID: {d[1]}, Name: {d[2]}, Specialty: {d[3]}")
        
    print("\n--- All Doctors (to see linked user_ids) ---")
    cursor.execute("SELECT id, user_id, name FROM doctors;")
    all_docs = cursor.fetchall()
    for ad in all_docs:
        print(f"DoctorID: {ad[0]}, UserID: {ad[1]}, Name: {ad[2]}")
        
    conn.close()
