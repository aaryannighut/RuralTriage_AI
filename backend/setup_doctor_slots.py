#!/usr/bin/env python3
"""
Setup default time slots for all doctors.
"""

from app.database import SessionLocal
from app.models import Doctor

db = SessionLocal()

try:
    doctors = db.query(Doctor).all()
    
    if not doctors:
        print("❌ No doctors found!")
        db.close()
        exit(1)
    
    # Define default time slots (9 AM to 5 PM, hourly)
    default_slots = [
        {"day": "Monday", "time": "09:00"},
        {"day": "Monday", "time": "10:00"},
        {"day": "Monday", "time": "11:00"},
        {"day": "Monday", "time": "02:00"},
        {"day": "Monday", "time": "03:00"},
        {"day": "Monday", "time": "04:00"},
        {"day": "Tuesday", "time": "09:00"},
        {"day": "Tuesday", "time": "10:00"},
        {"day": "Tuesday", "time": "11:00"},
        {"day": "Tuesday", "time": "02:00"},
        {"day": "Tuesday", "time": "03:00"},
        {"day": "Tuesday", "time": "04:00"},
        {"day": "Wednesday", "time": "09:00"},
        {"day": "Wednesday", "time": "10:00"},
        {"day": "Wednesday", "time": "11:00"},
        {"day": "Wednesday", "time": "02:00"},
        {"day": "Wednesday", "time": "03:00"},
        {"day": "Wednesday", "time": "04:00"},
        {"day": "Thursday", "time": "09:00"},
        {"day": "Thursday", "time": "10:00"},
        {"day": "Thursday", "time": "11:00"},
        {"day": "Thursday", "time": "02:00"},
        {"day": "Thursday", "time": "03:00"},
        {"day": "Thursday", "time": "04:00"},
        {"day": "Friday", "time": "09:00"},
        {"day": "Friday", "time": "10:00"},
        {"day": "Friday", "time": "11:00"},
        {"day": "Friday", "time": "02:00"},
        {"day": "Friday", "time": "03:00"},
        {"day": "Friday", "time": "04:00"},
    ]
    
    updated_count = 0
    for doctor in doctors:
        if not doctor.time_slots:
            doctor.time_slots = default_slots
            updated_count += 1
        elif len(doctor.time_slots) == 0:
            doctor.time_slots = default_slots
            updated_count += 1
    
    if updated_count > 0:
        db.commit()
        print(f"✅ Added time slots to {updated_count} doctors")
    else:
        print(f"✅ All {len(doctors)} doctors already have time slots")
    
    # Show sample
    sample = db.query(Doctor).first()
    if sample:
        print(f"Sample: {sample.name} has {len(sample.time_slots or [])} available slots")
    
except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    exit(1)
finally:
    db.close()
