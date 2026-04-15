#!/usr/bin/env python3
"""
Sync global Medicine stock with Sharma's pharmacy inventory.
"""

from app.database import SessionLocal
from app.models import Medicine, Pharmacy, PharmacyInventory

db = SessionLocal()

try:
    from sqlalchemy import text
    
    # Find Sharma pharmacy
    sharma = db.query(Pharmacy).filter(Pharmacy.store_name.ilike("Sharma%")).first()
    
    if not sharma:
        print("❌ Pharmacy 'Sharma' not found!")
        db.close()
        exit(1)
    
    print(f"✓ Found Sharma pharmacy (ID: {sharma.id})")
    
    # Use raw SQL to update all medicines' stock from Sharma's PharmacyInventory
    update_sql = text("""
        UPDATE medicines m
        SET stock = pi.quantity_available
        FROM pharmacy_inventory pi
        WHERE pi.pharmacy_id = :pharmacy_id
        AND pi.medicine_id = m.id
    """)
    
    result = db.execute(update_sql, {"pharmacy_id": sharma.id})
    db.commit()
    
    updated = result.rowcount
    print(f"✅ Updated stock for {updated} medicines")
    
    # Show sample
    m1 = db.query(Medicine).first()
    if m1:
        print(f"\nSample: {m1.name} now has stock = {m1.stock}")
    
except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    exit(1)
finally:
    db.close()
