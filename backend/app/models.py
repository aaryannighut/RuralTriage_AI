from sqlalchemy import Column, Integer, Boolean, String, Numeric, ForeignKey, DateTime, func
from sqlalchemy import JSON
from app.database import Base


# -------------------------
# User Table (Auth)
# -------------------------

class User(Base):
    __tablename__ = "users"

    id       = Column(Integer, primary_key=True, index=True)
    name     = Column(String, nullable=False)
    email    = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    role     = Column(String, default="patient")   # patient / doctor / pharmacy


# -------------------------
# Doctor Table
# -------------------------

class Doctor(Base):
    __tablename__ = "doctors"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=True)
    name          = Column(String, nullable=False)
    qualification = Column(String, nullable=False)
    specialty     = Column(String, nullable=False)
    experience    = Column(Integer, default=0)
    fee           = Column(Numeric(10, 2), default=0)
    hospital      = Column(String, default="")
    city          = Column(String, default="")
    state         = Column(String, default="")
    phone         = Column(String, default="")
    email         = Column(String, default="")
    availability  = Column(String, default="Available")   # Available / Busy / On Leave
    consult_mode  = Column(String, default="Both")        # Video / In-Person / Both
    verified      = Column(Boolean, default=False)
    certificate   = Column(String, nullable=True)         # filename or URL
    time_slots    = Column(JSON, default=list)
    appointments  = Column(JSON, default=list)          # Available time slots per day
            # Booked appointments


# -------------------------
# Patient Table
# -------------------------

class Patient(Base):
    __tablename__ = "patients"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    name           = Column(String, nullable=False)
    age            = Column(Integer, nullable=True)
    gender         = Column(String, nullable=True)
    phone          = Column(String, nullable=True)
    blood_group    = Column(String, nullable=True)
    symptoms       = Column(JSON, default=list)
    health_metrics = Column(JSON, default=dict)
    health_records = Column(JSON, default=list)
    prescriptions  = Column(JSON, default=list)
    family_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)


class SymptomRecord(Base):
    __tablename__ = "symptom_records"

    id           = Column(Integer, primary_key=True, index=True)
    patient_id   = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    symptom_name = Column(String, nullable=False)
    duration     = Column(String, nullable=False)
    recorded_at  = Column(DateTime(timezone=True), nullable=False, index=True)


# -------------------------
# Pharmacy Table
# -------------------------

class Pharmacy(Base):
    __tablename__ = "pharmacies"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=True)
    pharmacist_name  = Column(String, nullable=False)
    store_name       = Column(String, nullable=False)
    degree           = Column(String, default="")
    license_number   = Column(String, default="")
    phone            = Column(String, default="")
    email            = Column(String, default="")
    address          = Column(String, default="")
    city             = Column(String, default="")
    state            = Column(String, default="")
    pincode          = Column(String, default="")
    opening_hours    = Column(String, default="")
    verified         = Column(Boolean, default=False)


# -------------------------
# Pharmacy Inventory Table
# -------------------------

class PharmacyInventory(Base):
    __tablename__ = "pharmacy_inventory"

    id                 = Column(Integer, primary_key=True, index=True)
    pharmacy_id        = Column(Integer, ForeignKey("pharmacies.id"), nullable=False)
    medicine_id        = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    quantity_available = Column(Integer, default=0)

class PharmacyTransaction(Base):
    __tablename__ = "pharmacy_transactions"

    id              = Column(Integer, primary_key=True, index=True)
    pharmacy_id     = Column(Integer, ForeignKey("pharmacies.id"), nullable=False)
    medicine_name   = Column(String, nullable=False)
    quantity_change = Column(Integer, nullable=False)
    action          = Column(String, nullable=False) # "added", "removed", "updated", "dispensed"
    date            = Column(DateTime, default=func.now())

# -------------------------
# Medicine Table
# -------------------------

class Medicine(Base):
    __tablename__ = "medicines"

    id                   = Column(Integer, primary_key=True, index=True)
    name                 = Column(String, nullable=False)
    brand                = Column(String, default="")
    category             = Column(String, default="Other")
    dose                 = Column(String, default="")
    form                 = Column(String, default="Tablet")
    price                = Column(Numeric(10, 2), default=0)
    stock                = Column(Integer, default=0)
    min_stock            = Column(Integer, default=20)
    manufacturer         = Column(String, default="")
    expiry               = Column(String, default="")     # stored as "YYYY-MM"
    prescription_required = Column(Boolean, default=False)


# -------------------------
# Appointment Table
# -------------------------

class Appointment(Base):
    __tablename__ = "appointments"

    id           = Column(Integer, primary_key=True, index=True)
    patient_id   = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id    = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    doctor_name  = Column(String, nullable=False)
    specialty    = Column(String, nullable=False)
    date         = Column(String, nullable=False)
    time         = Column(String, nullable=False)
    status       = Column(String, default="Scheduled") # Scheduled | Completed | Cancelled
    meeting_link = Column(String, nullable=True)
    created_at   = Column(DateTime, default=func.now())
