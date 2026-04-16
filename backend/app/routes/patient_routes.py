from datetime import datetime
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Patient, SymptomRecord, User
from app.settings import Settings

_settings = Settings()

router = APIRouter(prefix="/patients", tags=["Patients"])

# ── AI Symptom Analysis config ───────────────────────────────────────────────

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

SYMPTOM_MASTER_PROMPT = """
You are a highly capable AI Symptom Triage Assistant. Your objective is to analyze patient symptoms and provide a structured, clinical-style assessment.

### YOUR ROLE:
1. Provide a brief summary of the patient's state.
2. Identify possible conditions (suggestive only, not diagnostic).
3. Explain why the symptoms match those conditions.
4. Offer medical advice (always include a recommendation to consult a doctor).
5. Outline actionable next steps.
6. Provide specific precautions for the next 2–3 days.

### OUTPUT FORMAT:
You MUST respond with a valid JSON object ONLY. Do not include any text before or after the JSON.
The JSON structure:
{
  "summary": "1–2 line concise summary",
  "possible_conditions": ["Condition 1", "Condition 2"],
  "explanation": ["Reason 1", "Reason 2"],
  "medical_advice": ["Advice 1", "Advice 2"],
  "next_steps": ["Step 1", "Step 2"],
  "risk_level": "Low | Medium | High | Critical",
  "final_decision": "Treat Locally | Monitor / Follow-up | Refer to Higher Hospital | Emergency Referral",
  "decision_reasoning": "Reasoning for the triage decision",
  "precautions": ["Precaution 1", "Precaution 2"]
}

### MAPPING RULES:
- risk_level LOW -> final_decision: "Treat Locally"
- risk_level MEDIUM -> final_decision: "Monitor / Follow-up"
- risk_level HIGH -> final_decision: "Refer to Higher Hospital"
- risk_level CRITICAL -> final_decision: "Emergency Referral"

### RULES:
- If symptoms are severe (chest pain, breathing issues), set risk_level to "High".
- Be professional, clinical, and reassuring.
- Do NOT provide a definitive diagnosis.
- Ensure all precautions are actionable.
"""

FOLLOWUP_MASTER_PROMPT = """
You are a highly capable clinical assistant. You are reviewing a previous triage assessment and a user's follow-up query.

### YOUR ROLE:
1. Analyze the user's new query in the context of the previous triage.
2. Provide an UPDATED triage assessment that incorporates the new information.
3. Refine the risk level, conditions, and precautions if necessary.

### OUTPUT FORMAT:
You MUST respond with a valid JSON object ONLY, following the EXACT same structure as the initial triage.
{
  "summary": "Updated summary including new details",
  "possible_conditions": [...],
  "explanation": [...],
  "medical_advice": [...],
  "next_steps": [...],
  "risk_level": "Low | Medium | High | Critical",
  "final_decision": "Decision",
  "decision_reasoning": "Reasoning",
  "precautions": [...]
}

Ensure the response remains clinical, structured, and includes a mandatory "consult a doctor" advice.
"""



def current_local_timestamp() -> datetime:
    return datetime.now().astimezone()


def parse_recorded_at(recorded_at: Optional[str]) -> datetime:
    if not recorded_at:
        return current_local_timestamp()
    normalized = recorded_at.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return current_local_timestamp()
    return parsed if parsed.tzinfo else parsed.astimezone()


def serialize_symptom_record(symptom: SymptomRecord) -> dict[str, Any]:
    return {
        "id": symptom.id,
        "symptom_name": symptom.symptom_name,
        "duration": symptom.duration,
        "recorded_at": symptom.recorded_at.isoformat(),
    }


def migrate_legacy_symptoms(patient: Patient, db: Session) -> None:
    legacy_symptoms = patient.symptoms or []
    if not legacy_symptoms:
        return

    for symptom in legacy_symptoms:
        db.add(
            SymptomRecord(
                patient_id=patient.id,
                symptom_name=symptom.get("symptom_name", "Unknown"),
                duration=symptom.get("duration", "Unknown"),
                recorded_at=parse_recorded_at(symptom.get("recorded_at")),
            )
        )

    patient.symptoms = []
    db.commit()
    db.refresh(patient)


def list_symptoms(patient_id: int, db: Session) -> list[dict[str, Any]]:
    records = (
        db.query(SymptomRecord)
        .filter(SymptomRecord.patient_id == patient_id)
        .order_by(SymptomRecord.recorded_at.desc(), SymptomRecord.id.desc())
        .all()
    )
    return [serialize_symptom_record(record) for record in records]


def patient_to_response(patient: Patient, db: Session) -> dict[str, Any]:
    return {
        "id": patient.id,
        "name": patient.name,
        "user_id": patient.user_id,
        "age": patient.age,
        "gender": patient.gender,
        "phone": patient.phone,
        "blood_group": patient.blood_group,
        "symptoms": list_symptoms(patient.id, db),
        "health_metrics": patient.health_metrics or {},
        "health_records": patient.health_records or [],
        "prescriptions": patient.prescriptions or [],
        "family_doctor_id": patient.family_doctor_id,
    }


class FamilyDoctorIn(BaseModel):
    patient_id: int
    doctor_id: int

@router.post("/set-family-doctor")
def set_family_doctor(data: FamilyDoctorIn, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient.family_doctor_id = data.doctor_id
    db.commit()
    db.refresh(patient)
    return {"message": "Family doctor updated successfully", "family_doctor_id": patient.family_doctor_id}

@router.get("/{patient_id}/family-doctor")
def get_family_doctor(patient_id: int, db: Session = Depends(get_db)):
    from app.models import Doctor
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if not patient.family_doctor_id:
        return {"doctor": None}
        
    doctor = db.query(Doctor).filter(Doctor.id == patient.family_doctor_id).first()
    if not doctor:
        return {"doctor": None}
        
    # Manual serialization to avoid circular dependencies and ensure clean JSON
    doc_dict = {
        "id": doctor.id,
        "name": doctor.name,
        "qualification": doctor.qualification,
        "specialty": doctor.specialty,
        "experience": doctor.experience,
        "fee": float(doctor.fee) if doctor.fee else 0.0,
        "hospital": doctor.hospital,
        "city": doctor.city,
        "state": doctor.state,
        "availability": doctor.availability,
        "verified": doctor.verified
    }
    return {"doctor": doc_dict}

@router.put("/change-family-doctor")
def change_family_doctor(data: FamilyDoctorIn, db: Session = Depends(get_db)):
    return set_family_doctor(data, db)

@router.delete("/remove-family-doctor/{patient_id}")
def remove_family_doctor(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient.family_doctor_id = None
    db.commit()
    return {"message": "Family doctor removed successfully"}


# ── Prescriptions ──────────────────────────────────────────────────────────────

class PrescriptionItemIn(BaseModel):
    medicine: str
    dosage: str
    duration: str = ""
    notes: str = ""


class PrescriptionIn(BaseModel):
    patient_id: int
    items: list[PrescriptionItemIn]
    issued_at: Optional[str] = None
    issued_by: str = ""


@router.post("/{patient_id}/prescriptions", status_code=201)
def add_prescription(patient_id: int, data: PrescriptionIn, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    prescriptions = list(patient.prescriptions or [])
    new_rx = {
        "id": len(prescriptions) + 1,
        "patient_id": patient_id,
        "items": [item.model_dump() for item in data.items],
        "issued_at": data.issued_at or datetime.utcnow().isoformat(),
        "issued_by": data.issued_by,
    }
    prescriptions.append(new_rx)
    patient.prescriptions = prescriptions
    db.commit()
    db.refresh(patient)
    return {"message": "Prescription issued successfully", "prescription": new_rx}


@router.get("/{patient_id}/prescriptions")
def get_prescriptions(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient.prescriptions or []


class PatientIn(BaseModel):
    name: str
    user_id: Optional[int] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    symptoms: Optional[list[Any]] = []
    health_metrics: Optional[dict[str, Any]] = {}
    health_records: Optional[list[Any]] = []
    prescriptions: Optional[list[Any]] = []
    family_doctor_id: Optional[int] = None


class PatientOut(PatientIn):
    id: int

    class Config:
        from_attributes = True


class SymptomAdd(BaseModel):
    symptom_name: str
    duration: str
    recorded_at: Optional[str] = None


class SymptomBatchAdd(BaseModel):
    symptom_names: list[str]
    duration: str


@router.get("/", response_model=list[PatientOut])
def list_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    for patient in patients:
        migrate_legacy_symptoms(patient, db)
    return [patient_to_response(patient, db) for patient in patients]


@router.post("/", response_model=PatientOut, status_code=201)
def create_patient(data: PatientIn, db: Session = Depends(get_db)):
    payload = data.model_dump()
    symptoms = payload.pop("symptoms", []) or []
    patient = Patient(**payload)
    db.add(patient)
    db.commit()
    db.refresh(patient)

    for symptom in symptoms:
        db.add(
            SymptomRecord(
                patient_id=patient.id,
                symptom_name=symptom.get("symptom_name", "Unknown"),
                duration=symptom.get("duration", "Unknown"),
                recorded_at=parse_recorded_at(symptom.get("recorded_at")),
            )
        )
    if symptoms:
        db.commit()

    db.refresh(patient)
    return patient_to_response(patient, db)


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    migrate_legacy_symptoms(patient, db)
    return patient_to_response(patient, db)


@router.get("/user/{user_id}", response_model=PatientOut)
def get_patient_by_user_id(user_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()
    
    if not patient:
        # Auto-create profile if missing for a valid user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        patient = Patient(user_id=user.id, name=user.name)
        db.add(patient)
        db.commit()
        db.refresh(patient)
        
    migrate_legacy_symptoms(patient, db)
    return patient_to_response(patient, db)


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: int, data: PatientIn, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    payload = data.model_dump()
    payload.pop("symptoms", None)
    for key, value in payload.items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)
    migrate_legacy_symptoms(patient, db)
    return patient_to_response(patient, db)


@router.delete("/{patient_id}", status_code=204)
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    db.query(SymptomRecord).filter(SymptomRecord.patient_id == patient.id).delete(synchronize_session=False)
    db.delete(patient)
    db.commit()


@router.get("/by-user/{user_id}", response_model=PatientOut)
def get_patient_by_user(user_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found for this user")
    migrate_legacy_symptoms(patient, db)
    return patient_to_response(patient, db)


@router.post("/{patient_id}/symptoms")
def add_symptom(patient_id: int, symptom: SymptomAdd, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    migrate_legacy_symptoms(patient, db)
    new_symptom = SymptomRecord(
        patient_id=patient.id,
        symptom_name=symptom.symptom_name,
        duration=symptom.duration,
        recorded_at=parse_recorded_at(symptom.recorded_at),
    )
    db.add(new_symptom)
    db.commit()
    db.refresh(new_symptom)

    return {
        "message": "Symptom added",
        "patient_id": patient_id,
        "symptom": serialize_symptom_record(new_symptom),
    }


@router.post("/{patient_id}/symptoms/batch")
def add_symptoms_batch(patient_id: int, payload: SymptomBatchAdd, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    symptom_names = [name.strip() for name in payload.symptom_names if name.strip()]
    if not symptom_names:
        raise HTTPException(status_code=400, detail="No symptoms provided")

    migrate_legacy_symptoms(patient, db)
    new_symptoms = [
        SymptomRecord(
            patient_id=patient.id,
            symptom_name=name,
            duration=payload.duration,
            recorded_at=current_local_timestamp(),
        )
        for name in symptom_names
    ]
    db.add_all(new_symptoms)
    db.commit()
    for symptom in new_symptoms:
        db.refresh(symptom)

    return {
        "message": "Symptoms added",
        "patient_id": patient_id,
        "symptoms": [serialize_symptom_record(symptom) for symptom in new_symptoms],
    }


@router.delete("/{patient_id}/symptoms/{symptom_name}")
def remove_symptom(
    patient_id: int,
    symptom_name: str,
    symptom_id: Optional[str] = None,
    recorded_at: Optional[str] = None,
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    migrate_legacy_symptoms(patient, db)

    query = db.query(SymptomRecord).filter(SymptomRecord.patient_id == patient.id)
    if symptom_id:
        query = query.filter(SymptomRecord.id == int(symptom_id))
    elif recorded_at:
        query = query.filter(
            SymptomRecord.symptom_name == symptom_name,
            SymptomRecord.recorded_at == parse_recorded_at(recorded_at),
        )
    else:
        query = query.filter(SymptomRecord.symptom_name == symptom_name)

    deleted_count = query.delete(synchronize_session=False)
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="Symptom not found")

    db.commit()
    return {"message": "Symptom removed", "patient_id": patient_id}


# ── AI Symptom Analysis ─────────────────────────────────────────────────────


class SymptomAnalysisIn(BaseModel):
    symptom_names: list[str]
    duration: str


class TriageResponse(BaseModel):
    summary: str
    possible_conditions: list[str]
    explanation: list[str]
    medical_advice: list[str]
    next_steps: list[str]
    risk_level: str
    final_decision: str
    decision_reasoning: str
    precautions: list[str]


class FollowUpIn(BaseModel):
    previous_analysis: TriageResponse
    user_query: str


def calculate_risk_level(symptoms: list[str], duration: str) -> str:
    """
    Initial risk evaluation based on symptoms and duration.
    - LOW: mild symptoms (1-2), short duration (< 24h)
    - MEDIUM: fever + cough, or moderate duration (1-3 days)
    - HIGH: severe symptoms or long duration (>3 days)
    - CRITICAL: immediate life-threatening symptoms
    """
    symptoms_lower = [s.lower() for s in symptoms]
    
    # Critical symptoms check
    critical_indicators = ["chest pain", "breathing", "shortness of breath", "unconscious", "heavy bleeding"]
    if any(any(ind in s for ind in critical_indicators) for s in symptoms_lower):
        return "Critical"
    
    # Severe symptoms check
    severe_indicators = ["severe vomiting", "neck stiffness", "confusion", "high fever"]
    if any(any(ind in s for ind in severe_indicators) for s in symptoms_lower):
        return "High"

    duration_lower = duration.lower()
    if "more than 7 days" in duration_lower or "4-7 days" in duration_lower:
        return "High"
    
    if ("fever" in symptoms_lower and "cough" in symptoms_lower) or "1-3 days" in duration_lower or len(symptoms) >= 3:
        return "Medium"
        
    return "Low"


@router.post("/ai/symptom-analysis", response_model=TriageResponse)
async def analyze_symptoms(data: SymptomAnalysisIn):
    import json as _json
    from urllib import request, error

    api_key = _settings.GROQ_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")

    model = _settings.GROQ_MODEL or "llama-3.3-70b-versatile"
    symptom_text = ", ".join(data.symptom_names)
    
    calculated_risk = calculate_risk_level(data.symptom_names, data.duration)

    user_prompt = f"""
Patient symptoms: {symptom_text}
Duration: {data.duration}
Preliminary Risk Assessment: {calculated_risk}

Please provide a detailed clinical analysis in JSON format. 
Ensure the risk_level in your response matches or refines the Preliminary Risk Assessment provided.
"""

    try:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYMPTOM_MASTER_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"}
        }

        req = request.Request(
            GROQ_API_URL,
            data=_json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "RuralTriageAI/1.0",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=60) as resp:
                result = _json.loads(resp.read().decode("utf-8"))
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            raise HTTPException(status_code=500, detail=f"Groq HTTP {exc.code}: {body}")
        except error.URLError as exc:
            raise HTTPException(status_code=500, detail=f"Groq request failed: {exc.reason}")

        if "choices" not in result:
            raise HTTPException(status_code=500, detail=f"AI API Error: {result}")

        ai_output_str = result["choices"][0]["message"]["content"]
        
        try:
            ai_data = _json.loads(ai_output_str)
            # Ensure the structure matches TriageResponse
            return TriageResponse(**ai_data)
        except (_json.JSONDecodeError, ValueError) as e:
             raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}\nOutput: {ai_output_str}")

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Internal Failure: {str(e)}\n{traceback.format_exc()}")
@router.post("/triage/followup", response_model=TriageResponse)
async def analyze_followup(data: FollowUpIn):
    import json as _json
    from urllib import request, error

    api_key = _settings.GROQ_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")

    model = _settings.GROQ_MODEL or "llama-3.3-70b-versatile"
    
    context_text = _json.dumps(data.previous_analysis.model_dump(), indent=2)

    user_prompt = f"""
### PREVIOUS ANALYSIS:
{context_text}

### USER FOLLOW-UP QUERY:
{data.user_query}

Please provide an updated triage assessment in JSON format based on the new query.
"""

    try:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": FOLLOWUP_MASTER_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"}
        }

        req = request.Request(
            GROQ_API_URL,
            data=_json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "RuralTriageAI/1.0",
            },
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=60) as resp:
                result = _json.loads(resp.read().decode("utf-8"))
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            raise HTTPException(status_code=500, detail=f"Groq HTTP {exc.code}: {body}")
        except error.URLError as exc:
            raise HTTPException(status_code=500, detail=f"Groq request failed: {exc.reason}")

        if "choices" not in result:
            raise HTTPException(status_code=500, detail=f"AI API Error: {result}")

        ai_output_str = result["choices"][0]["message"]["content"]
        
        try:
            ai_data = _json.loads(ai_output_str)
            return TriageResponse(**ai_data)
        except (_json.JSONDecodeError, ValueError) as e:
             raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}\nOutput: {ai_output_str}")

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Internal Failure: {str(e)}\n{traceback.format_exc()}")
