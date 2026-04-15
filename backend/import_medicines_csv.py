"""Import medicine catalog data from a CSV file into the medicines table.

Usage:
    python import_medicines_csv.py <path-to-csv>
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Base, Medicine, Pharmacy, PharmacyInventory


FORM_KEYWORDS = {
    "tablet": "Tablet",
    "capsule": "Capsule",
    "syrup": "Syrup",
    "injection": "Injection",
    "cream": "Cream",
    "gel": "Gel",
    "drop": "Drops",
    "lotion": "Lotion",
    "ointment": "Ointment",
    "inhaler": "Inhaler",
    "suspension": "Suspension",
    "solution": "Solution",
    "soap": "Soap",
    "granules": "Granules",
    "infusion": "Infusion",
    "patch": "Patch",
}


def parse_bool(value: str) -> bool:
    return value.strip().lower() in {"true", "yes", "1"}


def parse_int(value: str) -> int:
    digits = re.sub(r"[^\d]", "", value or "")
    return int(digits) if digits else 0


def parse_price(value: str) -> float:
    numeric = re.sub(r"[^\d.]", "", value or "")
    return float(numeric) if numeric else 0.0


def infer_form(name: str, raw_form: str) -> str:
    text = f"{name} {raw_form}".lower()
    for keyword, label in FORM_KEYWORDS.items():
        if keyword in text:
            return label
    return "Other"


def infer_category(name: str, composition: str) -> str:
    text = f"{name} {composition}".lower()
    if any(token in text for token in ["metformin", "glimepiride", "teneligliptin", "dapagliflozin", "voglibose", "sitagliptin"]):
        return "Diabetes"
    if any(token in text for token in ["rosuvastatin", "atorvastatin"]):
        return "Cholesterol"
    if any(token in text for token in ["telmisartan", "amlodipine", "losartan", "ramipril", "metoprolol", "nifedipine", "nebivolol", "olmesartan"]):
        return "Blood Pressure"
    if any(token in text for token in ["cefixime", "ofloxacin", "levofloxacin", "azithromycin", "linezolid", "amoxicillin", "cefpodoxime", "cefuroxime", "rifaximin"]):
        return "Antibiotic"
    if any(token in text for token in ["paracetamol", "diclofenac", "aceclofenac", "tapentadol", "tramadol", "ibuprofen", "etoricoxib", "nimesulide", "tolperisone"]):
        return "Pain Relief"
    if any(token in text for token in ["vitamin", "methylcobalamin", "folic", "calc", "d3", "alpha lipoic", "b6"]):
        return "Supplement"
    if any(token in text for token in ["aspirin", "clopidogrel"]):
        return "Cardiac"
    if any(token in text for token in ["rabeprazole", "pantoprazole", "domperidone", "antacid", "itopride", "levosulpiride"]):
        return "Antacid"
    if "thyroid" in text or "thyrox" in text:
        return "Thyroid"
    return "Other"


def extract_dose(name: str, composition: str) -> str:
    comp = (composition or "").strip().strip("()")
    if comp:
        return comp
    match = re.search(r"(\d+(?:\.\d+)?(?:mg|mcg|g|ml|iu|%)?(?:/\d+(?:\.\d+)?(?:mg|mcg|g|ml|iu|%)?)*)", name, re.IGNORECASE)
    return match.group(1) if match else ""


def extract_brand(name: str) -> str:
    brand = re.split(r"\b\d", name, maxsplit=1)[0].strip(" -/")
    return brand or name.strip()


def load_rows(csv_path: Path) -> tuple[list[dict[str, object]], list[dict[str, object]], list[dict[str, object]]]:
    catalog: dict[str, dict[str, object]] = {}
    pharmacy_names: set[str] = set()
    inventory_rows: list[dict[str, object]] = []

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            name = (row.get("medicine_name") or "").strip()
            if not name:
                continue

            price = parse_price(row.get("price") or "")
            stock = parse_int(row.get("quantity_available") or "0")
            composition = (row.get("composition") or "").strip()
            raw_form = (row.get("medicine_type") or "").strip()
            pharmacy_name = (row.get("pharmacy") or "").strip()
            key = name.lower()

            existing = catalog.get(key)
            if existing is None:
                catalog[key] = {
                    "name": name,
                    "brand": extract_brand(name),
                    "category": infer_category(name, composition),
                    "dose": extract_dose(name, composition),
                    "form": infer_form(name, raw_form),
                    "price": price,
                    "stock": stock,
                    "min_stock": 20,
                    "manufacturer": "",
                    "expiry": "",
                    "prescription_required": parse_bool(row.get("prescription_required") or "False"),
                }
            else:
                existing["stock"] = int(existing["stock"]) + stock
                existing["price"] = max(float(existing["price"]), price)
                existing["prescription_required"] = bool(existing["prescription_required"]) or parse_bool(row.get("prescription_required") or "False")

            if pharmacy_name and pharmacy_name != "Out of Stock" and stock > 0:
                pharmacy_names.add(pharmacy_name)
                inventory_rows.append({
                    "pharmacy_name": pharmacy_name,
                    "medicine_name": name,
                    "quantity_available": stock,
                })

    pharmacies = [
        {
            "store_name": store_name,
            "pharmacist_name": store_name,
            "degree": "",
            "license_number": "",
            "phone": "",
            "email": "",
            "address": "",
            "city": "",
            "state": "",
            "pincode": "",
            "opening_hours": "",
            "verified": False,
        }
        for store_name in sorted(pharmacy_names)
    ]

    return list(catalog.values()), pharmacies, inventory_rows


def import_catalog(csv_path: Path) -> int:
    medicine_rows, pharmacy_rows, inventory_rows = load_rows(csv_path)
    db: Session = SessionLocal()
    try:
        Base.metadata.create_all(bind=db.get_bind())
        db.query(PharmacyInventory).delete()
        db.query(Medicine).delete()

        existing_pharmacies = {pharmacy.store_name: pharmacy for pharmacy in db.query(Pharmacy).all()}
        for pharmacy_row in pharmacy_rows:
            store_name = str(pharmacy_row["store_name"])
            if store_name not in existing_pharmacies:
                pharmacy = Pharmacy(**pharmacy_row)
                db.add(pharmacy)
                db.flush()
                existing_pharmacies[store_name] = pharmacy

        db.bulk_insert_mappings(Medicine, medicine_rows)
        db.commit()

        medicine_map = {medicine.name: medicine.id for medicine in db.query(Medicine).all()}
        aggregated_inventory: dict[tuple[int, int], int] = {}
        for row in inventory_rows:
            pharmacy = existing_pharmacies.get(str(row["pharmacy_name"]))
            medicine_id = medicine_map.get(str(row["medicine_name"]))
            if not pharmacy or not medicine_id:
                continue
            key = (pharmacy.id, medicine_id)
            aggregated_inventory[key] = aggregated_inventory.get(key, 0) + int(row["quantity_available"])

        db.bulk_insert_mappings(
            PharmacyInventory,
            [
                {
                    "pharmacy_id": pharmacy_id,
                    "medicine_id": medicine_id,
                    "quantity_available": quantity,
                }
                for (pharmacy_id, medicine_id), quantity in aggregated_inventory.items()
            ],
        )
        db.commit()
        return len(medicine_rows)
    finally:
        db.close()


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python import_medicines_csv.py <path-to-csv>")
        return 1

    csv_path = Path(sys.argv[1])
    if not csv_path.exists():
        print(f"CSV file not found: {csv_path}")
        return 1

    count = import_catalog(csv_path)
    print(f"Imported {count} medicines into the database.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())