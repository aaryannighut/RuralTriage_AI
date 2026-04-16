from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AppointmentBase(BaseModel):
    patient_id: int
    doctor_id: int
    doctor_name: str
    specialty: str
    date: str
    time: str
    meeting_link: Optional[str] = None
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentReschedule(BaseModel):
    new_date: str
    new_time: str

class AppointmentOut(AppointmentBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
