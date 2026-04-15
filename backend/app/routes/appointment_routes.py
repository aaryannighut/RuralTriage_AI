from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import Appointment
from app.schemas.appointment_schema import AppointmentCreate, AppointmentOut, AppointmentReschedule

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.post("/create", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db)):
    new_apt = Appointment(**data.model_dump())
    db.add(new_apt)
    db.commit()
    db.refresh(new_apt)
    return new_apt

@router.get("/upcoming/{patient_id}", response_model=List[AppointmentOut])
def get_upcoming_appointments(patient_id: int, db: Session = Depends(get_db)):
    return db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.status == "Scheduled"
    ).all()

@router.get("/history/{patient_id}", response_model=List[AppointmentOut])
def get_appointment_history(patient_id: int, db: Session = Depends(get_db)):
    return db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.status.in_(["Completed", "Cancelled"])
    ).all()

@router.put("/cancel/{appointment_id}", response_model=AppointmentOut)
def cancel_appointment(appointment_id: int, db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    apt.status = "Cancelled"
    db.commit()
    db.refresh(apt)
    return apt

@router.put("/reschedule/{appointment_id}", response_model=AppointmentOut)
def reschedule_appointment(appointment_id: int, data: AppointmentReschedule, db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    apt.date = data.new_date
    apt.time = data.new_time
    apt.status = "Scheduled"
    db.commit()
    db.refresh(apt)
    return apt

@router.put("/complete/{appointment_id}", response_model=AppointmentOut)
def complete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    apt.status = "Completed"
    db.commit()
    db.refresh(apt)
    return apt
