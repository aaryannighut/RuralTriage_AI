from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Doctor

router = APIRouter(prefix="/doctors", tags=["Doctors"])


class DoctorIn(BaseModel):
    name: str
    qualification: str
    specialty: str
    experience: int = 0
    fee: float = 0.0
    hospital: str = ""
    city: str = ""
    state: str = ""
    phone: str = ""
    email: str = ""
    availability: str = "Available"   # Available | Busy | On Leave
    consult_mode: str = "Both"        # Video | In-Person | Both
    verified: bool = False
    certificate: Optional[str] = None
    user_id: Optional[int] = None


class DoctorOut(DoctorIn):
    id: int

    class Config:
        from_attributes = True


@router.get("/", response_model=list[DoctorOut])
def list_doctors(query: str = None, db: Session = Depends(get_db)):
    if query:
        return db.query(Doctor).filter(
            (Doctor.name.ilike(f"%{query}%")) |
            (Doctor.specialty.ilike(f"%{query}%")) |
            (Doctor.qualification.ilike(f"%{query}%"))
        ).all()
    return db.query(Doctor).all()

@router.get("/search", response_model=list[DoctorOut])
def search_doctors(query: str, db: Session = Depends(get_db)):
    return db.query(Doctor).filter(
        (Doctor.name.ilike(f"%{query}%")) |
        (Doctor.specialty.ilike(f"%{query}%")) |
        (Doctor.qualification.ilike(f"%{query}%"))
    ).all()


@router.get("/user/{user_id}", response_model=DoctorOut)
def get_doctor_by_user_id(user_id: int, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.user_id == user_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found for this user")
    return doc


@router.post("/", response_model=DoctorOut, status_code=201)
def create_doctor(data: DoctorIn, db: Session = Depends(get_db)):
    doc = Doctor(**data.model_dump())
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doc


@router.put("/{doctor_id}", response_model=DoctorOut)
def update_doctor(doctor_id: int, data: DoctorIn, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    for key, value in data.model_dump().items():
        setattr(doc, key, value)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{doctor_id}", status_code=204)
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    db.delete(doc)
    db.commit()


# ─────────────────────────────────── Appointments ────────────────────────────────────

class TimeSlot(BaseModel):
    day: str  # "Monday", "Tuesday", etc.
    time: str  # "09:00", "10:00", etc.


class TimeSlotOut(TimeSlot):
    booked: bool = False


class BookAppointmentIn(BaseModel):
    patient_id: int
    patient_name: str
    appointment_date: str  # "2025-03-20"
    time_slot: str  # "09:00"
    notes: Optional[str] = None


class AppointmentOut(BookAppointmentIn):
    appointment_id: int
    doctor_id: int
    status: str  # "pending" | "confirmed" | "rejected"
    created_at: str


@router.post("/{doctor_id}/time-slots", status_code=201)
def add_time_slots(doctor_id: int, slots: list[TimeSlot], db: Session = Depends(get_db)):
    """Add available time slots for a doctor."""
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    current_slots = doc.time_slots or []
    for slot in slots:
        slot_dict = slot.model_dump()
        if slot_dict not in current_slots:
            current_slots.append(slot_dict)
    
    doc.time_slots = current_slots
    db.commit()
    return {"message": "Time slots added", "slots": doc.time_slots}


@router.get("/{doctor_id}/available-slots")
def get_available_slots(doctor_id: int, db: Session = Depends(get_db)):
    """Get available time slots for a doctor (excluding booked ones)."""
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Generate standard time slots: 9 AM to 5 PM, hourly
    base_slots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
    
    appointments = doc.appointments or []
    
    # Get all booked time slots (for any date with status != 'rejected')
    booked_times = set()
    for apt in appointments:
        if apt.get('status') != 'rejected':
            booked_times.add(apt.get('time_slot'))
    
    available = [
        {"time": time, "booked": time in booked_times}
        for time in base_slots
    ]
    
    return {"doctor_id": doctor_id, "slots": available}


@router.post("/{doctor_id}/book-appointment")
def book_appointment(doctor_id: int, payload: BookAppointmentIn, db: Session = Depends(get_db)):
    """Book an appointment with a doctor."""
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    appointments = doc.appointments or []
    
    # Check for duplicate booking
    for apt in appointments:
        if (apt.get('patient_id') == payload.patient_id and 
            apt.get('appointment_date') == payload.appointment_date and
            apt.get('time_slot') == payload.time_slot and
            apt.get('status') != 'rejected'):
            raise HTTPException(
                status_code=400, 
                detail="Time slot already booked for this patient on this date"
            )
    
    # Check if slot is available
    for apt in appointments:
        if (apt.get('appointment_date') == payload.appointment_date and
            apt.get('time_slot') == payload.time_slot and
            apt.get('status') != 'rejected'):
            raise HTTPException(
                status_code=400,
                detail="Time slot is not available"
            )
    
    from datetime import datetime
    appointment_id = len([a for a in appointments if not a.get('is_deleted')]) + 1
    
    new_appointment = {
        "appointment_id": appointment_id,
        "patient_id": payload.patient_id,
        "patient_name": payload.patient_name,
        "appointment_date": payload.appointment_date,
        "time_slot": payload.time_slot,
        "notes": payload.notes or "",
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "is_deleted": False
    }
    
    appointments.append(new_appointment)
    doc.appointments = appointments
    db.commit()
    
    return {
        "message": "Appointment request sent",
        "appointment": {**new_appointment, "doctor_id": doctor_id}
    }


@router.get("/{doctor_id}/appointments")
def get_doctor_appointments(doctor_id: int, db: Session = Depends(get_db)):
    """Get all appointments for a doctor."""
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    appointments = [apt for apt in (doc.appointments or []) if not apt.get('is_deleted')]
    
    return {
        "doctor_id": doctor_id,
        "appointments": appointments
    }


@router.put("/{doctor_id}/appointments/{appointment_id}")
def update_appointment_status(
    doctor_id: int,
    appointment_id: int,
    status: str,  # "confirmed" | "rejected"
    db: Session = Depends(get_db)
):
    """Update appointment status (confirm or reject)."""
    if status not in ["confirmed", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'confirmed' or 'rejected'")
    
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    appointments = doc.appointments or []
    updated = False
    
    for apt in appointments:
        if apt.get('appointment_id') == appointment_id and not apt.get('is_deleted'):
            apt['status'] = status
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    doc.appointments = appointments
    db.commit()
    
    return {
        "message": f"Appointment {status} successfully",
        "appointment_id": appointment_id,
        "status": status
    }


@router.delete("/{doctor_id}/appointments/{appointment_id}")
def delete_appointment(doctor_id: int, appointment_id: int, db: Session = Depends(get_db)):
    """Soft delete an appointment."""
    from datetime import datetime
    
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    appointments = doc.appointments or []
    deleted = False
    
    for apt in appointments:
        if apt.get('appointment_id') == appointment_id:
            apt['is_deleted'] = True
            apt['deleted_at'] = datetime.utcnow().isoformat()
            deleted = True
            break
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    doc.appointments = appointments
    db.commit()
    
    return {"message": "Appointment deleted successfully"}
