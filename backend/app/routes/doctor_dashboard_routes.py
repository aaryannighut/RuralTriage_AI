"""
/doctor/* – Dedicated Doctor Dashboard API
==========================================
All endpoints are scoped to an authenticated doctor identified by user_id.
Groq AI integration is OPTIONAL – endpoints return results with or without it.
"""

from datetime import datetime
from typing import Any, List, Optional
import httpx
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Appointment, Doctor, Patient, SymptomRecord
from app.settings import Settings

_settings = Settings()
router = APIRouter(prefix="/doctor", tags=["Doctor Dashboard"])

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# ── helpers ────────────────────────────────────────────────────────────────────

def _get_doctor_or_404(user_id: int, db: Session) -> Doctor:
    doc = db.query(Doctor).filter(Doctor.user_id == user_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found for this user.")
    return doc


def _priority_score(symptoms: list) -> str:
    """Heuristic priority derived from symptom triage data."""
    HIGH_KEYWORDS = {"chest pain", "breathing", "unconscious", "seizure", "stroke", "cardiac", "severe"}
    MED_KEYWORDS  = {"fever", "vomiting", "diarrhea", "headache", "cough", "pain"}
    text = " ".join(
        (s.get("symptom_name", "") if isinstance(s, dict) else str(s)).lower()
        for s in symptoms
    )
    if any(k in text for k in HIGH_KEYWORDS):
        return "HIGH"
    if any(k in text for k in MED_KEYWORDS):
        return "MEDIUM"
    return "LOW"


async def _ask_groq(system_prompt: str, user_message: str) -> Optional[str]:
    """Call Groq API. Returns None gracefully if key missing or request fails."""
    key = _settings.GROQ_API_KEY
    if not key:
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": _settings.GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_message},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 600,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    except Exception:
        return None


def _latest_symptoms(patient: Patient, db: Session) -> list:
    records = (
        db.query(SymptomRecord)
        .filter(SymptomRecord.patient_id == patient.id)
        .order_by(SymptomRecord.recorded_at.desc())
        .limit(10)
        .all()
    )
    return [{"symptom_name": r.symptom_name, "duration": r.duration,
              "recorded_at": r.recorded_at.isoformat() if r.recorded_at else None}
             for r in records]


# ── 1. Patient Queue ──────────────────────────────────────────────────────────

@router.get("/patients/queue")
def get_patient_queue(user_id: int = Query(...), db: Session = Depends(get_db)):
    """
    Return today's + upcoming scheduled patients for this doctor.
    Includes priority score derived from current symptoms.
    """
    doctor = _get_doctor_or_404(user_id, db)

    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.status == "Scheduled",
        )
        .order_by(Appointment.date.asc(), Appointment.time.asc())
        .all()
    )

    queue = []
    for apt in appointments:
        patient = db.query(Patient).filter(Patient.id == apt.patient_id).first()
        symptoms = _latest_symptoms(patient, db) if patient else []
        queue.append({
            "appointment_id": apt.id,
            "patient_id":     apt.patient_id,
            "patient_name":   patient.name if patient else f"Patient #{apt.patient_id}",
            "age":            patient.age if patient else None,
            "gender":         patient.gender if patient else None,
            "phone":          patient.phone if patient else None,
            "blood_group":    patient.blood_group if patient else None,
            "date":           apt.date,
            "time":           apt.time,
            "specialty":      apt.specialty,
            "symptoms":       symptoms,
            "priority":       _priority_score(symptoms),
        })

    # Sort: HIGH first, then by time
    order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    queue.sort(key=lambda x: (order.get(x["priority"], 3), x["date"], x["time"]))
    return queue


# ── 2. Patient History ────────────────────────────────────────────────────────

@router.get("/patient/{patient_id}/history")
def get_patient_history(patient_id: int, db: Session = Depends(get_db)):
    """
    Full clinical history for a specific patient:
    – past consultations / appointment history
    – symptom records
    – health records
    – prescriptions
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    past_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.status.in_(["Completed", "Cancelled"]),
        )
        .order_by(Appointment.date.desc())
        .all()
    )

    symptoms = _latest_symptoms(patient, db)

    return {
        "patient": {
            "id":          patient.id,
            "name":        patient.name,
            "age":         patient.age,
            "gender":      patient.gender,
            "phone":       patient.phone,
            "blood_group": patient.blood_group,
            "health_metrics": patient.health_metrics or {},
        },
        "symptoms": symptoms,
        "health_records": patient.health_records or [],
        "prescriptions": patient.prescriptions or [],
        "past_appointments": [
            {
                "id":          a.id,
                "doctor_name": a.doctor_name,
                "specialty":   a.specialty,
                "date":        a.date,
                "time":        a.time,
                "status":      a.status,
            }
            for a in past_appointments
        ],
    }


# ── 3. Prescription ───────────────────────────────────────────────────────────

class PrescriptionMedicineIn(BaseModel):
    name: str
    dosage: str
    duration: str = ""
    notes: str = ""


class DoctorPrescriptionIn(BaseModel):
    patient_id: int
    doctor_user_id: int
    medicines: List[PrescriptionMedicineIn]
    notes: str = ""


@router.post("/prescription", status_code=201)
async def issue_prescription(data: DoctorPrescriptionIn, db: Session = Depends(get_db)):
    """
    Issue a prescription from a doctor to a patient.
    Stored in patient.prescriptions JSON – immediately visible in patient dashboard.
    Optionally gets AI-suggested notes from Groq.
    """
    doctor = _get_doctor_or_404(data.doctor_user_id, db)
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Optional: Groq AI clinical note
    ai_note = None
    if _settings.GROQ_API_KEY and data.medicines:
        med_list = ", ".join(f"{m.name} {m.dosage}" for m in data.medicines)
        symptoms = _latest_symptoms(patient, db)
        sym_text = ", ".join(s["symptom_name"] for s in symptoms) if symptoms else "not specified"
        ai_note = await _ask_groq(
            system_prompt="You are a clinical pharmacist. Provide a 1-2 sentence brief for the patient about their prescription.",
            user_message=f"Patient symptoms: {sym_text}. Prescribed: {med_list}. Doctor notes: {data.notes}",
        )

    prescription = {
        "id":          str(uuid.uuid4()),
        "patient_id":  data.patient_id,
        "doctor_id":   doctor.id,
        "doctor_name": doctor.name,
        "status":      "pending",
        "items": [
            {
                "medicine": m.name,
                "dosage":   m.dosage,
                "duration": m.duration,
                "notes":    m.notes,
            }
            for m in data.medicines
        ],
        "general_notes": data.notes,
        "ai_clinical_note": ai_note,
        "issued_at": datetime.utcnow().isoformat(),
        "issued_by": doctor.name,
    }

    prescriptions = list(patient.prescriptions or [])
    prescriptions.append(prescription)
    patient.prescriptions = prescriptions
    db.commit()
    db.refresh(patient)

    return {
        "message": "Prescription issued and dispatched to patient and pharmacy registry.",
        "prescription": prescription,
        "ai_note": ai_note,
    }


# ── 4. Appointment Management ─────────────────────────────────────────────────

@router.get("/appointments")
def get_doctor_schedule(
    user_id: int = Query(...),
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    All appointments for this doctor, enriched with patient name.
    Optional ?status=Scheduled|Completed|Cancelled filter.
    """
    doctor = _get_doctor_or_404(user_id, db)

    q = db.query(Appointment).filter(Appointment.doctor_id == doctor.id)
    if status:
        q = q.filter(Appointment.status == status)
    appointments = q.order_by(Appointment.date.asc(), Appointment.time.asc()).all()

    results = []
    for apt in appointments:
        patient = db.query(Patient).filter(Patient.id == apt.patient_id).first()
        results.append({
            "id":           apt.id,
            "patient_id":   apt.patient_id,
            "patient_name": patient.name if patient else f"Patient #{apt.patient_id}",
            "doctor_name":  apt.doctor_name,
            "specialty":    apt.specialty,
            "date":         apt.date,
            "time":         apt.time,
            "status":       apt.status,
            "meeting_link": apt.meeting_link,
            "notes":        apt.notes,
        })
    return results


# ── 5. Availability Status ────────────────────────────────────────────────────

class StatusUpdate(BaseModel):
    user_id: int
    status: str   # online | busy | offline (mapped to Available | Busy | On Leave)


@router.put("/status")
def update_availability(data: StatusUpdate, db: Session = Depends(get_db)):
    """Update doctor availability. Maps online→Available | busy→Busy | offline→On Leave."""
    doctor = _get_doctor_or_404(data.user_id, db)

    status_map = {
        "online":  "Available",
        "busy":    "Busy",
        "offline": "On Leave",
        # Also accept direct strings
        "Available": "Available",
        "Busy":      "Busy",
        "On Leave":  "On Leave",
    }
    mapped = status_map.get(data.status)
    if not mapped:
        raise HTTPException(status_code=400, detail=f"Invalid status '{data.status}'. Use online|busy|offline.")

    doctor.availability = mapped
    db.commit()
    db.refresh(doctor)
    return {"message": "Availability updated", "availability": doctor.availability}


# ── 6. High-Risk Patients (with optional AI enhancement) ─────────────────────

@router.get("/high-risk-patients")
async def get_high_risk_patients(user_id: int = Query(...), db: Session = Depends(get_db)):
    """
    Return queued patients classified as HIGH priority.
    Optionally enriches each with a Groq AI triage summary.
    """
    doctor = _get_doctor_or_404(user_id, db)

    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.status == "Scheduled",
        )
        .all()
    )

    high_risk = []
    for apt in appointments:
        patient = db.query(Patient).filter(Patient.id == apt.patient_id).first()
        symptoms = _latest_symptoms(patient, db) if patient else []
        priority = _priority_score(symptoms)
        if priority != "HIGH":
            continue

        ai_summary = None
        if _settings.GROQ_API_KEY and symptoms:
            sym_text = ", ".join(s["symptom_name"] for s in symptoms)
            ai_summary = await _ask_groq(
                system_prompt=(
                    "You are a clinical triage AI. Provide a 1-sentence urgent clinical summary for a doctor. "
                    "Focus on potential severity and immediate action needed."
                ),
                user_message=f"Patient presents with: {sym_text}",
            )

        high_risk.append({
            "appointment_id": apt.id,
            "patient_id":     apt.patient_id,
            "patient_name":   patient.name if patient else f"Patient #{apt.patient_id}",
            "date":           apt.date,
            "time":           apt.time,
            "symptoms":       symptoms,
            "priority":       "HIGH",
            "ai_summary":     ai_summary or f"High-risk indicators detected: {', '.join(s['symptom_name'] for s in symptoms[:3])}",
        })

    return high_risk


# ── 7. AI Diagnosis Suggestion ────────────────────────────────────────────────

class DiagnosisSuggestionIn(BaseModel):
    patient_id: int
    doctor_user_id: int


@router.post("/ai/diagnosis-suggestion")
async def get_ai_diagnosis(data: DiagnosisSuggestionIn, db: Session = Depends(get_db)):
    """
    Optional Groq AI: Given a patient's symptoms, suggest possible diagnoses
    and recommended prescription classes for the doctor to review.
    Returns a fallback message if Groq API key not configured.
    """
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    symptoms = _latest_symptoms(patient, db)
    if not symptoms:
        return {
            "ai_available": False,
            "message": "No symptoms on record for AI analysis.",
            "suggestions": None,
        }

    sym_text = ", ".join(s["symptom_name"] for s in symptoms)
    age_info = f", age {patient.age}" if patient.age else ""
    gender_info = f", {patient.gender}" if patient.gender else ""

    if not _settings.GROQ_API_KEY:
        return {
            "ai_available": False,
            "message": "Groq API not configured. Set GROQ_API_KEY in environment to enable AI suggestions.",
            "symptoms_reviewed": sym_text,
            "suggestions": None,
        }

    result = await _ask_groq(
        system_prompt=(
            "You are an AI clinical decision support assistant. A doctor is reviewing a patient. "
            "Provide: 1) Top 3 possible diagnoses (differential), 2) Recommended investigation tests, "
            "3) General drug classes to consider (not specific prescriptions). "
            "Format as JSON: {\"differentials\": [...], \"investigations\": [...], \"drug_classes\": [...], \"urgency\": \"Low|Medium|High\"}. "
            "Always remind the doctor these are AI suggestions only and not a diagnosis."
        ),
        user_message=f"Patient{age_info}{gender_info} presents with: {sym_text}",
    )

    if not result:
        return {
            "ai_available": False,
            "message": "Groq API request failed. Check connectivity or API key.",
            "suggestions": None,
        }

    import json
    try:
        suggestions = json.loads(result)
    except Exception:
        suggestions = {"raw": result}

    return {
        "ai_available": True,
        "symptoms_reviewed": sym_text,
        "suggestions": suggestions,
        "disclaimer": "AI-generated suggestions only. Clinical judgment of the treating doctor is final.",
    }


# ── 8. Dashboard Stats ────────────────────────────────────────────────────────

@router.get("/dashboard/stats")
def get_dashboard_stats(user_id: int = Query(...), db: Session = Depends(get_db)):
    """
    Aggregated statistics for the doctor's clinical dashboard cards.
    Returns today's patient count, total queued, completed, and high-risk count.
    """
    doctor = _get_doctor_or_404(user_id, db)
    today = datetime.utcnow().strftime("%Y-%m-%d")

    all_apts = (
        db.query(Appointment)
        .filter(Appointment.doctor_id == doctor.id)
        .all()
    )

    today_apts = [a for a in all_apts if a.date == today]
    scheduled  = [a for a in all_apts if a.status == "Scheduled"]
    completed  = [a for a in all_apts if a.status == "Completed"]

    # Count high-risk patients (heuristic from symptoms)
    high_risk_count = 0
    for apt in scheduled:
        patient = db.query(Patient).filter(Patient.id == apt.patient_id).first()
        if patient:
            symptoms = _latest_symptoms(patient, db)
            if _priority_score(symptoms) == "HIGH":
                high_risk_count += 1

    return {
        "today_patients": len(today_apts),
        "total_queued":   len(scheduled),
        "completed":      len(completed),
        "high_risk":      high_risk_count,
    }


# ── 9. List Prescriptions issued by this doctor ───────────────────────────────

@router.get("/prescriptions")
def get_doctor_prescriptions(user_id: int = Query(...), db: Session = Depends(get_db)):
    """
    Return all prescriptions issued by this doctor across all patients.
    Each entry includes patient_name and patient_id enrichment for display.
    """
    doctor = _get_doctor_or_404(user_id, db)

    all_patients = db.query(Patient).all()
    result: List[Any] = []

    for patient in all_patients:
        for rx in (patient.prescriptions or []):
            if rx.get("doctor_id") == doctor.id:
                result.append({
                    **rx,
                    "patient_name": patient.name,
                    "patient_id":   patient.id,
                })

    # Newest first
    result.sort(key=lambda x: x.get("issued_at", ""), reverse=True)
    return result

# ── 10. Notifications ──────────────────────────────────────────────────────────

class NotificationIn(BaseModel):
    doctor_id: int
    message: str

@router.post("/notification")
def send_notification(data: NotificationIn, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    notifications = list(doctor.notifications or [])
    notifications.append({
        "id": str(uuid.uuid4()),
        "message": data.message,
        "timestamp": datetime.utcnow().isoformat(),
        "read": False
    })
    doctor.notifications = notifications
    db.commit()
    return {"message": "Notification sent"}

@router.get("/notifications")
def get_notifications(user_id: int = Query(...), db: Session = Depends(get_db)):
    doctor = _get_doctor_or_404(user_id, db)
    return doctor.notifications or []


# ── 11. AI Report/Prescription Suggestions ───────────────────────────────────

@router.get("/ai/report-suggestions/{appointment_id}")
async def get_ai_report_suggestions(appointment_id: int, db: Session = Depends(get_db)):
    """
    Given an appointment, suggest specific medicines (tablets/syrups) 
    based on the symptoms (notes) recorded during booking.
    """
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    symptoms_text = apt.notes or "No specific symptoms recorded"
    
    if not _settings.GROQ_API_KEY:
        return {
            "ai_available": False,
            "message": "Groq API not configured.",
            "symptoms": symptoms_text,
            "suggestions": []
        }

    prompt = (
        "You are a clinical assistant. Based on the patient's symptoms, suggest 3-5 specific medication names (tablets, capsules, or syrups) "
        "available in India. Provide common dosage and reason. "
        "Return ONLY a JSON array of objects: [{\"medicine\": \"Name\", \"dosage\": \"10mg once daily\", \"duration\": \"5 days\", \"reason\": \"Used for...\"}]"
    )
    
    result = await _ask_groq(
        system_prompt=prompt,
        user_message=f"Symptoms: {symptoms_text}. Specialty: {apt.specialty}",
    )

    if not result:
        return {
            "ai_available": False, 
            "message": "AI generation failed.",
            "suggestions": []
        }

    import json
    import re
    try:
        # Clean the response to find the JSON array
        match = re.search(r'\[.*\]', result, re.DOTALL)
        if match:
            suggestions = json.loads(match.group())
        else:
            suggestions = json.loads(result)
    except Exception:
        return {
            "ai_available": False,
            "message": "Failed to parse AI response.",
            "raw": result,
            "suggestions": []
        }

    return {
        "ai_available": True,
        "symptoms": symptoms_text,
        "suggestions": suggestions
    }
