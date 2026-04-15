import sqlite3
import datetime
import json
import random

db_path = "c:/Users/Aaryan/OneDrive/Documents/Hackthons_Winner_Projects/RuralTriage_AI/backend/test.db"

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Find Dolly Boban
# A bit of a fuzzy search in case her name is stored differently
cursor.execute("SELECT * FROM doctors WHERE name LIKE '%Dolly%' OR name LIKE '%Boban%'")
dolly = cursor.fetchone()

if not dolly:
    print("Could not find DOLLY BOBAN in the database. Creating her...")
    # Get a dummy user for her
    cursor.execute("INSERT INTO users (name, email, password, role) VALUES ('Dolly Boban', 'dolly@example.com', 'dummy', 'doctor')")
    user_id = cursor.lastrowid
    cursor.execute("""
        INSERT INTO doctors (user_id, name, email, qualification, specialty, experience, fee, hospital, city, state, phone)
        VALUES (?, 'Dolly Boban', 'dolly@example.com', 'MD', 'CARDIOLOGY', 2, 200, 'LTCE', 'Thane', 'Maharashtra', '9999999999')
    """, (user_id,))
    doctor_id = cursor.lastrowid
    dolly = dict(id=doctor_id, user_id=user_id, name='Dolly Boban', specialty='CARDIOLOGY')
else:
    dolly = dict(dolly)
    print(f"Found DOLLY BOBAN: doctor_id={dolly['id']}, user_id={dolly['user_id']}")

doctor_id = dolly["id"]
doctor_user_id = dolly["user_id"]

# Get 4 patients to give her
cursor.execute("SELECT * FROM patients LIMIT 4")
patients = cursor.fetchall()
if len(patients) < 4:
    print("Not enough patients, adding dummies...")
    # Add dummies
    for i in range(4 - len(patients)):
        cursor.execute("INSERT INTO users (name, email, password, role) VALUES (?, ?, 'dummy', 'patient')", (f"Dummy Patient {i}", f"dummy{i}@example.com"))
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO patients (user_id, name, age) VALUES (?, ?, 30)", (user_id, f"Dummy Patient {i}"))
    cursor.execute("SELECT * FROM patients LIMIT 4")
    patients = cursor.fetchall()

today = datetime.datetime.now().strftime("%Y-%m-%d")

# Create 4 appointments for today
times = ["09:00", "09:30", "10:00", "11:30"]
statuses = ["Scheduled", "Scheduled", "Scheduled", "Scheduled"]
priorities = ["NORMAL", "HIGH", "NORMAL", "HIGH"]

ai_summaries = [
    "Routine follow up for BP.",
    "Patient reporting severe chest pain and breathlessness. Urgent cardiology evaluation needed.",
    "Mild palpitations reported.",
    "Elevated BP readings for the past 3 days. High CVD risk."
]

for idx, p in enumerate(patients):
    p_id = p["id"]
    p_name = p["name"]
    time_val = times[idx]
    
    # Check if already exists to avoid dupes
    cursor.execute("SELECT id FROM appointments WHERE patient_id=? AND doctor_id=? AND date=?", (p_id, doctor_id, today))
    if cursor.fetchone():
        print(f"Appointment for {p_name} already exists today.")
        continue

    symptoms = [{"symptom_name": "chest pain" if idx % 2 != 0 else "fatigue"}]
    
    # Update patient symptoms so it triggers priority
    cursor.execute("UPDATE patients SET symptoms=? WHERE id=?", (json.dumps(symptoms), p_id))
    
    # insert appointment
    cursor.execute("""
        INSERT INTO appointments (patient_id, doctor_id, doctor_name, specialty, date, time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (p_id, doctor_id, dolly["name"], dolly["specialty"], today, time_val, statuses[idx]))
    
    print(f"Added appointment for {p_name} at {time_val} ({priorities[idx]}).")

conn.commit()
conn.close()
print("Data seeded successfully!")
