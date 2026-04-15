#!/usr/bin/env python3
"""
Migrate database: add time_slots and appointments columns to doctors table.
"""

from sqlalchemy import text
from app.database import SessionLocal

db = SessionLocal()

try:
    # Get the underlying connection to execute raw SQL
    with db.connection() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM information_schema.columns WHERE table_name='doctors' AND column_name='time_slots'"))
        column_exists = result.scalar() > 0
        
        if not column_exists:
            print("Adding time_slots column to doctors table...")
            conn.execute(text("ALTER TABLE doctors ADD COLUMN time_slots JSONB DEFAULT '[]'::jsonb"))
            print("✓ time_slots column added")
        else:
            print("✓ time_slots column already exists")
        
        result = conn.execute(text("SELECT COUNT(*) FROM information_schema.columns WHERE table_name='doctors' AND column_name='appointments'"))
        column_exists = result.scalar() > 0
        
        if not column_exists:
            print("Adding appointments column to doctors table...")
            conn.execute(text("ALTER TABLE doctors ADD COLUMN appointments JSONB DEFAULT '[]'::jsonb"))
            print("✓ appointments column added")
        else:
            print("✓ appointments column already exists")
        
        conn.commit()
        print("\n✅ Database migration complete!")
        
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
finally:
    db.close()
