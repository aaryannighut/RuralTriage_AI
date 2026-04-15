from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Medicine, Pharmacy, PharmacyInventory


router = APIRouter(prefix="/pharmacies", tags=["Pharmacies"])


class PharmacyIn(BaseModel):
    pharmacist_name: str
    store_name: str
    degree: str = ""
    license_number: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    opening_hours: str = ""
    verified: bool = False
    user_id: Optional[int] = None


class PharmacyOut(PharmacyIn):
    id: int

    class Config:
        from_attributes = True


class PharmacyAvailabilityOut(BaseModel):
    pharmacy_id: int
    store_name: str
    pharmacist_name: str
    phone: str
    address: str
    city: str
    state: str
    pincode: str
    opening_hours: str
    verified: bool
    medicine_id: int
    medicine_name: str
    quantity_available: int


@router.get("/availability", response_model=list[PharmacyAvailabilityOut])
def get_pharmacy_availability(
    medicine_id: int = Query(...),
    db: Session = Depends(get_db),
):
    target_medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not target_medicine:
        return []

    # Match by normalized medicine name only (no brand/company matching).
    normalized_name = (target_medicine.name or "").strip().lower()
    if not normalized_name:
        return []

    name_col = func.lower(func.trim(Medicine.name))

    if len(normalized_name) >= 3:
        name_filter = (name_col == normalized_name) | (name_col.ilike(f"%{normalized_name}%"))
    else:
        name_filter = name_col == normalized_name

    rows = (
        db.query(
            Pharmacy.id.label("pharmacy_id"),
            Pharmacy.store_name,
            Pharmacy.pharmacist_name,
            Pharmacy.phone,
            Pharmacy.address,
            Pharmacy.city,
            Pharmacy.state,
            Pharmacy.pincode,
            Pharmacy.opening_hours,
            Pharmacy.verified,
            func.sum(PharmacyInventory.quantity_available).label("quantity_available"),
        )
        .join(PharmacyInventory, PharmacyInventory.pharmacy_id == Pharmacy.id)
        .join(Medicine, PharmacyInventory.medicine_id == Medicine.id)
        .filter(name_filter)
        .filter(PharmacyInventory.quantity_available > 0)
        .group_by(
            Pharmacy.id,
            Pharmacy.store_name,
            Pharmacy.pharmacist_name,
            Pharmacy.phone,
            Pharmacy.address,
            Pharmacy.city,
            Pharmacy.state,
            Pharmacy.pincode,
            Pharmacy.opening_hours,
            Pharmacy.verified,
        )
        .order_by(func.sum(PharmacyInventory.quantity_available).desc(), Pharmacy.store_name.asc())
        .all()
    )

    return [
        PharmacyAvailabilityOut(
            pharmacy_id=row.pharmacy_id,
            store_name=row.store_name,
            pharmacist_name=row.pharmacist_name,
            phone=row.phone,
            address=row.address,
            city=row.city,
            state=row.state,
            pincode=row.pincode,
            opening_hours=row.opening_hours,
            verified=row.verified,
            medicine_id=medicine_id,
            medicine_name=target_medicine.name,
            quantity_available=int(row.quantity_available or 0),
        )
        for row in rows
    ]


MOCK_PHARMACIES = [
    { "id": 1, "name": "Aarya Medi", "address": "Majiwada, Thane, Maharashtra, 400601", "phone": "8655401029", "timing": "8am - 11pm", "medicines": ["Paracetamol", "Ibuprofen", "ORS", "Domperidone", "Ondansetron"] },
    { "id": 2, "name": "Shiv Medical Store", "address": "Bhiwandi Village, Maharashtra", "phone": "9123456701", "timing": "9am - 10pm", "medicines": ["Paracetamol", "Cough Syrup", "Loperamide", "Digene"] },
    { "id": 3, "name": "Sai Krupa Medical", "address": "Kalyan Rural, Maharashtra", "phone": "9123456702", "timing": "8am - 9pm", "medicines": ["Azithromycin", "ORS", "Gelusil", "Montelukast"] },
    { "id": 4, "name": "Ganesh Medical", "address": "Dombivli Village Area", "phone": "9123456703", "timing": "7am - 10pm", "medicines": ["Ibuprofen", "Vitamin C", "Levocetirizine", "Salbutamol"] },
    { "id": 5, "name": "HealthCare Rural Med", "address": "Palghar Village", "phone": "9123456704", "timing": "8am - 8pm", "medicines": ["Paracetamol", "ORS", "Antacid Gel", "Budesonide", "Theophylline"] },
    { "id": 6, "name": "Om Sai Medical", "address": "Karjat Village", "phone": "9123456705", "timing": "9am - 9pm", "medicines": ["Amoxicillin", "Ibuprofen", "Clotrimazole", "Ketoconazole"] },
    { "id": 7, "name": "Jeevan Medical", "address": "Panvel Rural Area", "phone": "9123456706", "timing": "8am - 11pm", "medicines": ["Paracetamol", "Zincovit", "Hydrocortisone", "Calamine Lotion"] },
    { "id": 8, "name": "Krishna Medico", "address": "Raigad Village", "phone": "9123456707", "timing": "7am - 10pm", "medicines": ["ORS", "Cough Syrup", "Mupirocin", "Iron Tablets"] },
    { "id": 9, "name": "Mahalaxmi Medical", "address": "Alibaug Village", "phone": "9123456708", "timing": "8am - 9pm", "medicines": ["Paracetamol", "Azithromycin", "Calcium Tablets", "Vitamin D3"] },
    { "id": 10, "name": "Sanjeevani Medical", "address": "Vasai Rural", "phone": "9123456709", "timing": "9am - 10pm", "medicines": ["Ibuprofen", "ORS", "Folic Acid", "Multivitamin Syrup"] },
    { "id": 11, "name": "Rural Care Pharmacy", "address": "Virar Village", "phone": "9123456710", "timing": "8am - 9pm", "medicines": ["Paracetamol", "Antacid Gel", "Insulin Regular", "Glimepiride"] },
    { "id": 12, "name": "Green Health Medical", "address": "Dahanu Village", "phone": "9123456711", "timing": "8am - 8pm", "medicines": ["Vitamin C", "ORS", "Losartan", "Atenolol"] },
    { "id": 13, "name": "Shree Medical Store", "address": "Jawhar Village", "phone": "9123456712", "timing": "9am - 9pm", "medicines": ["Paracetamol", "Ibuprofen", "Clopidogrel", "Rabies Vaccine"] },
    { "id": 14, "name": "LifeCare Medical", "address": "Wada Village", "phone": "9123456713", "timing": "7am - 10pm", "medicines": ["Azithromycin", "ORS", "Tetanus Injection", "Amoxiclav"] },
    { "id": 15, "name": "Arogya Medical", "address": "Shahapur Village", "phone": "9123456714", "timing": "8am - 10pm", "medicines": ["Paracetamol", "Cough Syrup", "Cefixime", "Doxycycline"] },
    { "id": 16, "name": "Village Health Store", "address": "Murbad Rural", "phone": "9123456715", "timing": "8am - 9pm", "medicines": ["Ibuprofen", "Vitamin C", "Domperidone", "Digene"] },
    { "id": 17, "name": "Swasthya Medical", "address": "Pen Village", "phone": "9123456716", "timing": "9am - 10pm", "medicines": ["ORS", "Paracetamol", "Montelukast", "Salbutamol"] },
    { "id": 18, "name": "Om Health Pharmacy", "address": "Roha Village", "phone": "9123456717", "timing": "8am - 9pm", "medicines": ["Azithromycin", "Antacid Gel", "Clotrimazole", "Hydrocortisone"] },
    { "id": 19, "name": "Primary Care Medical", "address": "Mahad Village", "phone": "9123456718", "timing": "7am - 10pm", "medicines": ["Paracetamol", "ORS", "Iron Tablets", "Vitamin D3"] },
    { "id": 20, "name": "Gram Medical Center", "address": "Poladpur Village", "phone": "9123456719", "timing": "8am - 8pm", "medicines": ["Ibuprofen", "Cough Syrup", "Insulin Regular", "Losartan"] },
    { "id": 21, "name": "Jan Aushadhi Kendra", "address": "Ratnagiri Village", "phone": "9123456720", "timing": "8am - 9pm", "medicines": ["Paracetamol", "Vitamin C", "Clopidogrel", "Rabies Vaccine"] },
    { "id": 22, "name": "Sahyadri Medical", "address": "Chiplun Village", "phone": "9123456721", "timing": "9am - 10pm", "medicines": ["ORS", "Azithromycin", "Amoxiclav", "Doxycycline"] },
    { "id": 23, "name": "Coastal Health Pharmacy", "address": "Guhagar Village", "phone": "9123456722", "timing": "8am - 9pm", "medicines": ["Paracetamol", "Antacid Gel", "Domperidone", "Gelusil"] },
    { "id": 24, "name": "Konkan Medical", "address": "Khed Village", "phone": "9123456723", "timing": "8am - 10pm", "medicines": ["Ibuprofen", "ORS", "Levocetirizine", "Budesonide"] },
    { "id": 25, "name": "Seva Medical Store", "address": "Dapoli Village", "phone": "9123456724", "timing": "9am - 9pm", "medicines": ["Paracetamol", "Cough Syrup", "Ketoconazole", "Mupirocin"] },
    { "id": 26, "name": "Rural Life Pharmacy", "address": "Sindhudurg Village", "phone": "9123456725", "timing": "8am - 8pm", "medicines": ["Vitamin C", "ORS", "Calcium Tablets", "Folic Acid"] },
    { "id": 27, "name": "Healthy Village Med", "address": "Sawantwadi Village", "phone": "9123456726", "timing": "8am - 9pm", "medicines": ["Paracetamol", "Ibuprofen", "Glimepiride", "Atenolol"] },
    { "id": 28, "name": "Arogya Seva Medical", "address": "Malvan Village", "phone": "9123456727", "timing": "7am - 10pm", "medicines": ["ORS", "Azithromycin", "Tetanus Injection", "Cefixime"] },
    { "id": 29, "name": "Gramin Medical Store", "address": "Lanja Village", "phone": "9123456728", "timing": "8am - 9pm", "medicines": ["Paracetamol", "Antacid Gel", "Ondansetron", "Loperamide"] },
    { "id": 30, "name": "Health First Rural", "address": "Rajapur Village", "phone": "9123456729", "timing": "9am - 10pm", "medicines": ["Ibuprofen", "ORS", "Theophylline", "Calamine Lotion", "Multivitamin Syrup"] }
]

@router.get("/search")
def search_pharmacies_by_medicine(medicine: str = Query(...)):
    if not medicine or not medicine.strip():
        return []
    
    results = []
    query_lower = medicine.strip().lower()
    for p in MOCK_PHARMACIES:
        for med in p["medicines"]:
            if query_lower in med.lower():
                results.append({
                    "id": p["id"],
                    "name": p["name"],
                    "address": p["address"],
                    "phone": p["phone"],
                    "timing": p["timing"],
                    "available": True
                })
                break
    return results


class PharmacyInventoryOut(BaseModel):
    id: int
    pharmacy_id: int
    medicine_id: int
    quantity_available: int
    medicine: dict  # Include basic medicine details

@router.get("/{pharmacy_id}/inventory", response_model=list[PharmacyInventoryOut])
def get_pharmacy_inventory(pharmacy_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(PharmacyInventory, Medicine)
        .join(Medicine, PharmacyInventory.medicine_id == Medicine.id)
        .filter(PharmacyInventory.pharmacy_id == pharmacy_id)
        .all()
    )
    
    return [
        {
            "id": inv.id,
            "pharmacy_id": inv.pharmacy_id,
            "medicine_id": inv.medicine_id,
            "quantity_available": inv.quantity_available,
            "medicine": {
                "id": med.id,
                "name": med.name,
                "brand": med.brand,
                "category": med.category,
                "dose": med.dose,
                "form": med.form,
                "price": med.price,
                "min_stock": med.min_stock,
            }
        }
        for inv, med in rows
    ]


class InventoryUpdateIn(BaseModel):
    medicine_id: int
    quantity_added: int  # can be positive or negative to update stock

@router.post("/{pharmacy_id}/inventory")
def update_pharmacy_inventory(pharmacy_id: int, data: InventoryUpdateIn, db: Session = Depends(get_db)):
    inv = db.query(PharmacyInventory).filter(
        PharmacyInventory.pharmacy_id == pharmacy_id,
        PharmacyInventory.medicine_id == data.medicine_id
    ).first()
    
    if inv:
        inv.quantity_available += data.quantity_added
        if inv.quantity_available < 0:
            inv.quantity_available = 0
    else:
        inv = PharmacyInventory(
            pharmacy_id=pharmacy_id,
            medicine_id=data.medicine_id,
            quantity_available=data.quantity_added if data.quantity_added > 0 else 0
        )
        db.add(inv)
        
    db.commit()
    db.refresh(inv)
    return {"status": "success", "quantity_available": inv.quantity_available}


class InventorySetIn(BaseModel):
    quantity_available: int

@router.put("/{pharmacy_id}/inventory/{medicine_id}")
def set_pharmacy_inventory(pharmacy_id: int, medicine_id: int, data: InventorySetIn, db: Session = Depends(get_db)):
    inv = db.query(PharmacyInventory).filter(
        PharmacyInventory.pharmacy_id == pharmacy_id,
        PharmacyInventory.medicine_id == medicine_id
    ).first()
    
    if inv:
        inv.quantity_available = data.quantity_available
    else:
        inv = PharmacyInventory(
            pharmacy_id=pharmacy_id,
            medicine_id=medicine_id,
            quantity_available=data.quantity_available
        )
        db.add(inv)
        
    db.commit()
    db.refresh(inv)
    return {"status": "success", "quantity_available": inv.quantity_available}


@router.delete("/{pharmacy_id}/inventory/{medicine_id}", status_code=204)
def remove_pharmacy_inventory(pharmacy_id: int, medicine_id: int, db: Session = Depends(get_db)):
    inv = db.query(PharmacyInventory).filter(
        PharmacyInventory.pharmacy_id == pharmacy_id,
        PharmacyInventory.medicine_id == medicine_id
    ).first()
    
    if inv:
        db.delete(inv)
        db.commit()


# ── NEW DYNAMIC DISPENSARY APIs ───────────────────────────────────────────────

@router.get("/pharmacy/inventory/{pharmacy_id}")
def get_pharmacy_inventory_v2(pharmacy_id: int, db: Session = Depends(get_db)):
    rows = db.query(PharmacyInventory, Medicine).join(Medicine).filter(PharmacyInventory.pharmacy_id == pharmacy_id).all()
    return [{
        "id": inv.id,
        "medicine_name": med.name,
        "quantity": inv.quantity_available,
        "price": float(med.price),
        "expiry_date": med.expiry
    } for inv, med in rows]

class InventoryAddIn(BaseModel):
    pharmacy_id: int
    medicine_name: str
    quantity: int
    price: float
    expiry_date: str

@router.post("/pharmacy/inventory/add")
def add_pharmacy_inventory_v2(data: InventoryAddIn, db: Session = Depends(get_db)):
    # Find or create medicine
    med = db.query(Medicine).filter(func.lower(Medicine.name) == data.medicine_name.lower()).first()
    if not med:
        med = Medicine(name=data.medicine_name, price=data.price, expiry=data.expiry_date)
        db.add(med)
        db.flush()
    
    inv = db.query(PharmacyInventory).filter(
        PharmacyInventory.pharmacy_id == data.pharmacy_id,
        PharmacyInventory.medicine_id == med.id
    ).first()
    
    if inv:
        inv.quantity_available += data.quantity
    else:
        inv = PharmacyInventory(pharmacy_id=data.pharmacy_id, medicine_id=med.id, quantity_available=data.quantity)
        db.add(inv)
    
    db.commit()
    return {"status": "success"}

@router.get("/pharmacy/prescriptions/{pharmacy_id}")
def get_pharmacy_prescriptions_v2(pharmacy_id: int, db: Session = Depends(get_db)):
    from app.models import Patient
    patients = db.query(Patient).all()
    results = []
    for p in patients:
        for rx in (p.prescriptions or []):
            if rx.get("status") in ["pending", "accepted"]:
                results.append({
                    "id": rx.get("id"),
                    "patient_id": p.id,
                    "patient_name": p.name,
                    "doctor_name": rx.get("doctor_name"),
                    "issued_by": rx.get("issued_by"),
                    "medicines": rx.get("items", []),
                    "status": rx.get("status"),
                    "issued_at": rx.get("issued_at")
                })
    return sorted(results, key=lambda x: x.get("issued_at", ""), reverse=True)

class PrescriptionStatusUpdateInV2(BaseModel):
    status: str

@router.put("/pharmacy/prescription/{rx_id}")
def update_prescription_status_v2(rx_id: str, data: PrescriptionStatusUpdateInV2, db: Session = Depends(get_db)):
    from app.models import Patient
    patients = db.query(Patient).all()
    updated = False
    for p in patients:
        pxs = list(p.prescriptions or [])
        for rx in pxs:
            if str(rx.get("id")) == rx_id:
                rx["status"] = data.status
                updated = True
                break
        if updated:
            p.prescriptions = pxs
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(p, "prescriptions")
            db.commit()
            return {"status": "success", "new_status": data.status}
    raise HTTPException(status_code=404, detail="Prescription not found")

@router.get("/pharmacy/history/{pharmacy_id}")
def get_pharmacy_history_v2(pharmacy_id: int, db: Session = Depends(get_db)):
    from app.models import Patient
    patients = db.query(Patient).all()
    results = []
    for p in patients:
        for rx in (p.prescriptions or []):
            if rx.get("status") in ["dispensed", "rejected"]:
                results.append({
                    "patient_name": p.name,
                    "medicines": rx.get("items", []),
                    "date": rx.get("issued_at"),
                    "status": rx.get("status")
                })
    return sorted(results, key=lambda x: x.get("date", ""), reverse=True)

@router.get("/pharmacy/dashboard/stats")
def get_pharmacy_stats_v2(pharmacy_id: int = Query(...), db: Session = Depends(get_db)):
    sku_count = db.query(PharmacyInventory).filter(PharmacyInventory.pharmacy_id == pharmacy_id).count()
    from app.models import Patient
    all_px = db.query(Patient).all()
    pending = sum(1 for p in all_px for rx in (p.prescriptions or []) if rx.get("status") == "pending")
    return {
        "total_sku": sku_count,
        "pending_requests": pending,
        "market_status": "active"
    }


class PrescriptionStatusUpdateIn(BaseModel):
    status: str

@router.put("/prescriptions/{patient_id}/{rx_id}/status")
def update_prescription_status(patient_id: int, rx_id: str, data: PrescriptionStatusUpdateIn, db: Session = Depends(get_db)):
    from app.models import Patient
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    prescriptions = list(patient.prescriptions or [])
    found = False
    for rx in prescriptions:
        if str(rx.get("id")) == str(rx_id):
            rx["status"] = data.status
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(patient, "prescriptions")
    db.commit()
    return {"status": "success", "new_status": data.status}


@router.get("/user/{user_id}", response_model=PharmacyOut)
def get_pharmacy_by_user_id(user_id: int, db: Session = Depends(get_db)):
    pharmacy = db.query(Pharmacy).filter(Pharmacy.user_id == user_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy profile not found for this user")
    return pharmacy


@router.get("/", response_model=list[PharmacyOut])
def list_pharmacies(user_id: Optional[int] = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(Pharmacy)
    if user_id is not None:
        query = query.filter(Pharmacy.user_id == user_id)
    return query.all()


@router.post("/", response_model=PharmacyOut, status_code=201)
def create_pharmacy(data: PharmacyIn, db: Session = Depends(get_db)):
    pharmacy = Pharmacy(**data.model_dump())
    db.add(pharmacy)
    db.commit()
    db.refresh(pharmacy)
    return pharmacy


@router.get("/prescriptions")
def get_all_prescriptions(db: Session = Depends(get_db)):
    """
    Return all prescriptions across all patients – for the pharmacist
    to see what has been prescribed and needs to be dispensed.
    Newest first.
    """
    from app.models import Patient  # local import to avoid circular
    all_patients = db.query(Patient).all()
    result = []
    for patient in all_patients:
        for rx in (patient.prescriptions or []):
            result.append({
                **rx,
                "patient_name": patient.name,
                "patient_id":   patient.id,
            })
    result.sort(key=lambda x: x.get("issued_at", ""), reverse=True)
    return result


@router.get("/{pharmacy_id}", response_model=PharmacyOut)
def get_pharmacy(pharmacy_id: int, db: Session = Depends(get_db)):
    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    return pharmacy


@router.put("/{pharmacy_id}", response_model=PharmacyOut)
def update_pharmacy(pharmacy_id: int, data: PharmacyIn, db: Session = Depends(get_db)):
    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    for key, value in data.model_dump().items():
        setattr(pharmacy, key, value)
    db.commit()
    db.refresh(pharmacy)
    return pharmacy


@router.delete("/{pharmacy_id}", status_code=204)
def delete_pharmacy(pharmacy_id: int, db: Session = Depends(get_db)):
    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    db.delete(pharmacy)
    db.commit()