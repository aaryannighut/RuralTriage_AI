import sys
import os
from pathlib import Path

# Fix path to allow importing from 'app'
BASE_DIR = Path(__file__).resolve().parent.parent.parent # RuralTriage_AI/backend/
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User, Medicine, Doctor, Patient, Pharmacy, PharmacyInventory
import random

def seed_data():
    db: Session = SessionLocal()
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    print("Seeding 50 Medicines...")
    medicine_list = [
        ("Paracetamol", "Crocin", "Analgesic", "500mg", "Tablet", 20.00),
        ("Ibuprofen", "Brufen", "Analgesic", "400mg", "Tablet", 35.00),
        ("Amoxicillin", "Moxikind", "Antibiotic", "500mg", "Capsule", 110.00),
        ("Azithromycin", "Azithral", "Antibiotic", "500mg", "Tablet", 150.00),
        ("Metformin", "Glycomet", "Anti-Diabetic", "500mg", "Tablet", 45.00),
        ("Amlodipine", "Amlip", "Cardiovascular", "5mg", "Tablet", 30.00),
        ("Pantoprazole", "Pan-40", "Gastrointestinal", "40mg", "Tablet", 90.00),
        ("Cetirizine", "Okacet", "Antihistamine", "10mg", "Tablet", 15.00),
        ("ORS", "Electral", "Supplement", "21g", "Powder", 18.00),
        ("Digene", "Abbott", "Gastrointestinal", "10ml", "Syrup", 120.00),
        ("Dolo 650", "Micro Labs", "Analgesic", "650mg", "Tablet", 30.00),
        ("Atorvastatin", "Atorva", "Cardiovascular", "10mg", "Tablet", 85.00),
        ("Losartan", "Losar", "Cardiovascular", "50mg", "Tablet", 70.00),
        ("Telmisartan", "Telma", "Cardiovascular", "40mg", "Tablet", 110.00),
        ("Glimepiride", "Amaryl", "Anti-Diabetic", "2mg", "Tablet", 60.00),
        ("Salbutamol", "Asthalin", "Respiratory", "100mcg", "Inhaler", 150.00),
        ("Montelukast", "Montair", "Respiratory", "10mg", "Tablet", 140.00),
        ("Budesonide", "Pulmicort", "Respiratory", "0.5mg", "Respule", 200.00),
        ("Levocetirizine", "Levocet", "Antihistamine", "5mg", "Tablet", 25.00),
        ("Domperidone", "Domstal", "Gastrointestinal", "10mg", "Tablet", 40.00),
        ("Ondansetron", "Emset", "Gastrointestinal", "4mg", "Tablet", 55.00),
        ("Loperamide", "Imodium", "Gastrointestinal", "2mg", "Tablet", 20.00),
        ("Amoxiclav", "Augmentin", "Antibiotic", "625mg", "Tablet", 210.00),
        ("Cefixime", "Taxim-O", "Antibiotic", "200mg", "Tablet", 160.00),
        ("Doxycycline", "Doxyl-L", "Antibiotic", "100mg", "Capsule", 90.00),
        ("Zincovit", "Apex", "Supplement", "Multivitamin", "Tablet", 110.00),
        ("Calcium D3", "Shelcal", "Supplement", "500mg", "Tablet", 130.00),
        ("Iron Folic", "Autrin", "Supplement", "Cap", "Capsule", 180.00),
        ("Vitamin C", "Limcee", "Supplement", "500mg", "Chewable", 25.00),
        ("Ranitidine", "Zinetac", "Gastrointestinal", "150mg", "Tablet", 10.00),
        ("Diclofenac", "Voveran", "Analgesic", "50mg", "Tablet", 60.00),
        ("Clotrimazole", "Candid", "Antifungal", "1%", "Cream", 120.00),
        ("Ketoconazole", "Nizoral", "Antifungal", "2%", "Shampoo", 350.00),
        ("Mupirocin", "T-Bact", "Antibiotic", "2%", "Ointment", 250.00),
        ("Calamine", "Lacto", "Topical", "Lotion", "Lotion", 180.00),
        ("Hydrocortisone", "Wysolone", "Steroid", "5mg", "Tablet", 40.00),
        ("Rabies Vaccine", "Rabivax", "Vaccine", "0.5ml", "Injection", 450.00),
        ("Tetanus Toxoid", "Serum Inst", "Vaccine", "0.5ml", "Injection", 30.00),
        ("B-Complex", "Becosules", "Supplement", "Cap", "Capsule", 45.00),
        ("Gelusil", "Pfizer", "Gastrointestinal", "MPS", "Syrup", 140.00),
        ("Omeprazole", "Omez", "Gastrointestinal", "20mg", "Capsule", 60.00),
        ("Sitagliptin", "Januvia", "Anti-Diabetic", "50mg", "Tablet", 450.00),
        ("Vildagliptin", "Galvus", "Anti-Diabetic", "50mg", "Tablet", 380.00),
        ("Insulin Regular", "Huminsulin", "Anti-Diabetic", "40IU", "Injection", 160.00),
        ("Metoprolol", "Metolar", "Cardiovascular", "25mg", "Tablet", 45.00),
        ("Ramipril", "Cardace", "Cardiovascular", "2.5mg", "Tablet", 120.00),
        ("Albendazole", "Zentel", "Anthelmintic", "400mg", "Tablet", 25.00),
        ("Ciprofloxacin", "Ciplox", "Antibiotic", "500mg", "Tablet", 50.00),
        ("Erythromycin", "Althrocin", "Antibiotic", "250mg", "Tablet", 90.00),
        ("Theophylline", "Theo-Asthalin", "Respiratory", "100mg", "Tablet", 35.00)
    ]

    inserted_medicines = []
    for name, brand, cat, dose, form, price in medicine_list:
        existing = db.query(Medicine).filter(Medicine.name == name).first()
        if existing:
            inserted_medicines.append(existing)
            continue
            
        med = Medicine(
            name=name, brand=brand, category=cat, dose=dose, 
            form=form, price=price, stock=random.randint(50, 200),
            manufacturer="Generic India Ltd", expiry="2026-12"
        )
        db.add(med)
        db.flush()
        inserted_medicines.append(med)

    print("Seeding 7 Doctors...")
    doctor_data = [
        ("Dr. Rajesh Khanna", "MD Medicine", "General Physician", 15, 500, "Civil Hospital, Thane", "Thane"),
        ("Dr. Sneha Patil", "MBBS, DCH", "Pediatrician", 8, 400, "Rural Health Center, Wada", "Wada"),
        ("Dr. Amit Shah", "MD, DM Cardiology", "Cardiologist", 20, 800, "Apex Cardiac Center, Palghar", "Palghar"),
        ("Dr. Priya Sharma", "MS OBGYN", "Gynecologist", 10, 500, "Matoshree Clinic, Bhiwandi", "Bhiwandi"),
        ("Dr. Vikram Rathod", "MS Orthopaedics", "Orthopedic", 12, 600, "Bone & Joint Center, Kalyan", "Kalyan"),
        ("Dr. Anjali Deshmukh", "MS ENT", "ENT Specialist", 7, 450, "Rural Sub-Hospital, Jawhar", "Jawhar"),
        ("Dr. Nilesh More", "MD Dermatology", "Dermatologist", 9, 550, "More Skin Clinic, Shahapur", "Shahapur")
    ]
    
    for i, (name, qual, spec, exp, fee, hosp, city) in enumerate(doctor_data):
        email = f"doctor{i+1}@ruraltriage.com"
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(name=name, email=email, password="password123", role="doctor")
            db.add(user)
            db.flush()
        
        # Check if doctor profile exists
        doc = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        if not doc:
            doc = Doctor(
                user_id=user.id, name=name, qualification=qual, specialty=spec,
                experience=exp, fee=fee, hospital=hosp, city=city, state="Maharashtra",
                phone=f"982000000{i+1}", email=email, availability="Available"
            )
            db.add(doc)

    print("Seeding 5 Patients...")
    patient_data = [
        ("Rahul Verma", 28, "Male", "9123456780", "O+"),
        ("Sunita Jadhav", 45, "Female", "9123456781", "B+"),
        ("Master Aryan", 8, "Male", "9123456782", "A+"),
        ("Dada Saheb", 65, "Male", "9123456783", "AB+"),
        ("Kavita Mali", 32, "Female", "9123456784", "O-")
    ]
    
    for i, (name, age, gender, phone, bg) in enumerate(patient_data):
        email = f"patient{i+1}@gmail.com"
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(name=name, email=email, password="password123", role="patient")
            db.add(user)
            db.flush()
        
        pat = db.query(Patient).filter(Patient.user_id == user.id).first()
        if not pat:
            pat = Patient(
                user_id=user.id, name=name, age=age, gender=gender,
                phone=phone, blood_group=bg, 
                health_metrics={"height": 160 + i*2, "weight": 55 + i*5}
            )
            db.add(pat)

    print("Seeding 20 Pharmacies...")
    locations = [
        "Bhiwandi", "Wada", "Jawhar", "Palghar", "Murbad", 
        "Shahapur", "Dahanu", "Vikramgad", "Talasari", "Wada Village",
        "Manor", "Safale", "Kelwa", "Boisar", "Kasa",
        "Kudan", "Gholvad", "Bordi", "Charoti", "Ambesari"
    ]
    
    for i in range(20):
        email = f"pharma{i+1}@medical.com"
        p_name = f"Pharmacist {i+1}"
        s_name = f"{locations[i]} Medical Store"
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(name=p_name, email=email, password="password123", role="pharmacy")
            db.add(user)
            db.flush()
        
        pharma = db.query(Pharmacy).filter(Pharmacy.user_id == user.id).first()
        if not pharma:
            pharma = Pharmacy(
                user_id=user.id, pharmacist_name=p_name, store_name=s_name,
                degree="B.Pharm", license_number=f"MH-PH-{1000+i}",
                phone=f"88888888{i:02d}", email=email,
                address=f"Main Road, {locations[i]} Block",
                city=locations[i], state="Maharashtra", pincode=f"421{300+i}",
                opening_hours="9 AM - 10 PM", verified=True
            )
            db.add(pharma)
            db.flush()
        
            # Give each pharmacy some initial stock from the 50 medicines
            pharma_meds = random.sample(inserted_medicines, min(15, len(inserted_medicines)))
            for pm in pharma_meds:
                inv = PharmacyInventory(
                    pharmacy_id=pharma.id,
                    medicine_id=pm.id,
                    quantity_available=random.randint(20, 100)
                )
                db.add(inv)

    db.commit()
    db.close()
    print("Seeding Completed Successfully!")

if __name__ == "__main__":
    seed_data()
