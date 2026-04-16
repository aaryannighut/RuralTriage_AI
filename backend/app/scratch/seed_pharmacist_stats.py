import sys
import os
import uuid
from pathlib import Path
from datetime import datetime

# Fix path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from app.database import SessionLocal, engine
from app.models import PharmacyInventory, PharmacyTransaction, Medicine, Patient, Doctor
import random

def seed_stats():
    db: Session = SessionLocal()
    
    # Target Pharmacy ID 1 (Aarya Medi)
    PHARMA_ID = 1
    
    # 1. Add Inventory
    medicines = db.query(Medicine).all()
    if not medicines:
        print("No medicines found in DB. Run seed_everything.py first.")
        return

    print(f"Adding inventory for Pharmacy {PHARMA_ID}...")
    sample_meds = random.sample(medicines, min(25, len(medicines)))
    for med in sample_meds:
        inv = db.query(PharmacyInventory).filter(
            PharmacyInventory.pharmacy_id == PHARMA_ID,
            PharmacyInventory.medicine_id == med.id
        ).first()
        if not inv:
            inv = PharmacyInventory(
                pharmacy_id=PHARMA_ID,
                medicine_id=med.id,
                quantity_available=random.randint(5, 150)
            )
            db.add(inv)
    
    # 2. Add Transactions for Stats (Orders & Revenue)
    print(f"Adding transactions for Pharmacy {PHARMA_ID}...")
    for i in range(15):
        txn = PharmacyTransaction(
            pharmacy_id=PHARMA_ID,
            medicine_name="ORDER_REVENUE",
            quantity_change=random.randint(200, 800),
            action="revenue",
            date=datetime.now()
        )
        db.add(txn)
    
    # 3. Add Activity History
    for med in random.sample(medicines, 8):
        txn = PharmacyTransaction(
            pharmacy_id=PHARMA_ID,
            medicine_name=med.name,
            quantity_change=random.randint(10, 50),
            action="added",
            date=datetime.now()
        )
        db.add(txn)

    # 4. Add Pending Prescriptions to patients so they show in "Incoming Queue"
    print("Seeding pending prescriptions for the queue...")
    patients = db.query(Patient).all()
    doctors = db.query(Doctor).all()
    
    if patients and doctors:
        for i in range(3):
            p = patients[i % len(patients)]
            d = doctors[i % len(doctors)]
            
            new_rx = {
                "id": str(uuid.uuid4()),
                "doctor_id": d.id,
                "doctor_name": d.name,
                "issued_by": d.name,
                "issued_at": datetime.now().isoformat(),
                "status": "pending",
                "items": [
                    {"medicine": "Paracetamol", "dosage": "1-0-1", "duration": "5 days", "notes": "After food"},
                    {"medicine": "Amoxicillin", "dosage": "1-1-1", "duration": "3 days", "notes": "Complete course"}
                ],
                "general_notes": "Patient reports severe headache and fever.",
                "ai_clinical_note": "Symptoms suggest viral infection. Monitor temperature."
            }
            
            existing_rx = list(p.prescriptions or [])
            existing_rx.append(new_rx)
            p.prescriptions = existing_rx
            flag_modified(p, "prescriptions")

    db.commit()
    db.close()
    print("Dashboard data seeded successfully for Aarya Medi!")

if __name__ == "__main__":
    seed_stats()
