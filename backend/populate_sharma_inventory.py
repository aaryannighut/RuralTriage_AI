#!/usr/bin/env python3
"""
Populate Sharma pharmacy inventory with all medicines.
"""

from app.database import SessionLocal
from app.models import Medicine, Pharmacy, PharmacyInventory

db = SessionLocal()

try:
    # Find Sharma pharmacy
    sharma = db.query(Pharmacy).filter(Pharmacy.store_name.ilike("Sharma%")).first()
    
    if not sharma:
        print("❌ Pharmacy 'Sharma' not found!")
        db.close()
        exit(1)
    
    print(f"✓ Found Sharma pharmacy (ID: {sharma.id})")
    
    # Get all medicines
    medicines = db.query(Medicine).all()
    print(f"Found {len(medicines)} medicines to add to Sharma's inventory")
    
    # Clear existing inventory for Sharma
    deleted = db.query(PharmacyInventory).filter(
        PharmacyInventory.pharmacy_id == sharma.id
    ).delete()
    print(f"Cleared {deleted} existing inventory items")
    
    # Add all medicines to Sharma's inventory with default stock
    inventory_items = []
    for medicine in medicines:
        inventory_items.append({
            "pharmacy_id": sharma.id,
            "medicine_id": medicine.id,
            "quantity_available": 100,  # Default stock level
        })
    
    if inventory_items:
        db.bulk_insert_mappings(PharmacyInventory, inventory_items)
        db.commit()
        print(f"✅ Added {len(inventory_items)} medicines to Sharma's inventory (100 units each)")
    
    # Show final state
    count = db.query(PharmacyInventory).filter(
        PharmacyInventory.pharmacy_id == sharma.id
    ).count()
    print(f"Sharma's total inventory items: {count}")
    
except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    exit(1)
finally:
    db.close()
