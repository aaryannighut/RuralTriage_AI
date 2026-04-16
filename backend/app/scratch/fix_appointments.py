from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Appointment, Patient, User

db = SessionLocal()

print("--- Appointments ---")
appointments = db.query(Appointment).all()
for a in appointments:
    print(f"Appt ID: {a.id}, Patient ID: {a.patient_id}, Doctor Name: {a.doctor_name}, Status: {a.status}")

print("\n--- Patients ---")
patients = db.query(Patient).all()
for p in patients:
    print(f"Patient ID: {p.id}, User ID: {p.user_id}, Name: {p.name}")

print("\n--- Users ---")
users = db.query(User).all()
for u in users:
    print(f"User ID: {u.id}, Email: {u.email}, Role: {u.role}")
