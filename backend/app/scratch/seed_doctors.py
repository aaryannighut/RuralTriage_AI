from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Doctor

doctors_data = [
  {
    "id": 1,
    "name": "Ekanksh Mohite",
    "degree": "MD",
    "specialty": "Cardiology",
    "experience": "15 Years",
    "fee": 200,
    "status": "READY"
  },
  {
    "id": 2,
    "name": "Dr. Aarya Sharma",
    "degree": "MBBS",
    "specialty": "General Physician",
    "experience": "8 Years",
    "fee": 150,
    "status": "READY"
  },
  {
    "id": 3,
    "name": "Dr. Rahul Patil",
    "degree": "MD",
    "specialty": "Dermatology",
    "experience": "12 Years",
    "fee": 250,
    "status": "READY"
  },
  {
    "id": 4,
    "name": "Dr. Sneha Kulkarni",
    "degree": "MBBS",
    "specialty": "Pediatrics",
    "experience": "6 Years",
    "fee": 180,
    "status": "READY"
  },
  {
    "id": 5,
    "name": "Dr. Rohan Deshmukh",
    "degree": "MD",
    "specialty": "Orthopedics",
    "experience": "10 Years",
    "fee": 300,
    "status": "READY"
  },
  {
    "id": 6,
    "name": "Dr. Priya Nair",
    "degree": "MBBS",
    "specialty": "Gynecology",
    "experience": "9 Years",
    "fee": 220,
    "status": "READY"
  },
  {
    "id": 7,
    "name": "Dr. Amit Verma",
    "degree": "MD",
    "specialty": "Neurology",
    "experience": "14 Years",
    "fee": 350,
    "status": "READY"
  },
  {
    "id": 8,
    "name": "Dr. Kavita Joshi",
    "degree": "MBBS",
    "specialty": "ENT Specialist",
    "experience": "7 Years",
    "fee": 180,
    "status": "READY"
  },
  {
    "id": 9,
    "name": "Dr. Sandeep Yadav",
    "degree": "MD",
    "specialty": "Pulmonology",
    "experience": "11 Years",
    "fee": 280,
    "status": "READY"
  },
  {
    "id": 10,
    "name": "Dr. Meera Singh",
    "degree": "MBBS",
    "specialty": "General Physician",
    "experience": "5 Years",
    "fee": 150,
    "status": "READY"
  },
  {
    "id": 11,
    "name": "Dr. Arjun Mehta",
    "degree": "MD",
    "specialty": "Gastroenterology",
    "experience": "13 Years",
    "fee": 320,
    "status": "READY"
  },
  {
    "id": 12,
    "name": "Dr. Neha Gupta",
    "degree": "MBBS",
    "specialty": "Psychiatry",
    "experience": "6 Years",
    "fee": 200,
    "status": "READY"
  },
  {
    "id": 13,
    "name": "Dr. Vikram Rao",
    "degree": "MD",
    "specialty": "Oncology",
    "experience": "16 Years",
    "fee": 400,
    "status": "READY"
  },
  {
    "id": 14,
    "name": "Dr. Pooja Shah",
    "degree": "MBBS",
    "specialty": "Ophthalmology",
    "experience": "7 Years",
    "fee": 180,
    "status": "READY"
  },
  {
    "id": 15,
    "name": "Dr. Karan Malhotra",
    "degree": "MD",
    "specialty": "Urology",
    "experience": "12 Years",
    "fee": 300,
    "status": "READY"
  }
]

def seed():
    db = SessionLocal()
    try:
        count = 0
        for doc in doctors_data:
            # Check if doctor with same id or name already exists
            existing = db.query(Doctor).filter(Doctor.id == doc["id"]).first()
            if existing:
                print(f"Skipping {doc['name']} - ID {doc['id']} already exists.")
                continue
            
            # Extract experience number
            exp_years = int(doc["experience"].split()[0])
            
            new_doc = Doctor(
                id=doc["id"],
                name=doc["name"],
                qualification=doc["degree"],
                specialty=doc["specialty"],
                experience=exp_years,
                fee=doc["fee"],
                availability="Available" if doc["status"] == "READY" else doc["status"],
                hospital="Regional General Hospital",
                city="Pune",
                state="Maharashtra"
            )
            db.add(new_doc)
            count += 1
        
        db.commit()
        print(f"Successfully seeded {count} doctors.")
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
