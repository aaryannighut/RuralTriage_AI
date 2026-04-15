#!/usr/bin/env python3
"""
Remove all pharmacies except 'Sharma' and clean up inventory.
"""

from app.database import SessionLocal
from app.models import Pharmacy, PharmacyInventory

db = SessionLocal()

try:
    # Find Sharma pharmacy (with or without trailing space)
    sharma = db.query(Pharmacy).filter(Pharmacy.store_name.ilike("Sharma%")).first()
    
    if not sharma:
        print("❌ Pharmacy 'Sharma' not found!")
        db.close()
        exit(1)
    
    print(f"✓ Found Sharma pharmacy (ID: {sharma.id})")
    
    # Get all other pharmacies
    others = db.query(Pharmacy).filter(Pharmacy.id != sharma.id).all()
    print(f"Found {len(others)} other pharmacies to delete")
    
    # Delete inventory for other pharmacies
    for pharmacy in others:
        deleted_inv = db.query(PharmacyInventory).filter(
            PharmacyInventory.pharmacy_id == pharmacy.id
        ).delete()
        print(f"  • Deleted {deleted_inv} inventory rows for {pharmacy.store_name}")
        
        # Delete the pharmacy
        db.delete(pharmacy)
        print(f"  • Deleted pharmacy: {pharmacy.store_name}")
    
    db.commit()
    print("\n✅ Cleanup complete! Only 'Sharma' pharmacy remains.")
    
    # Show final state
    count = db.query(Pharmacy).count()
    print(f"Total pharmacies now: {count}")
    
except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    exit(1)
finally:
    db.close()
