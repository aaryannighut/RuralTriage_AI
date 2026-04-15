import sys
import os
from sqlalchemy import create_engine, text

# Add the project root to sys.path for backend imports
sys.path.append(os.path.join(os.getcwd(), 'backend'))

DB_URL = "sqlite:///backend/test.db"
engine = create_engine(DB_URL)

def sync_schema():
    with engine.connect() as conn:
        print("Checking 'doctors' table schema...")
        # Check if user_id column exists
        result = conn.execute(text("PRAGMA table_info(doctors)"))
        columns = [row[1] for row in result]
        
        if "user_id" not in columns:
            print("Adding 'user_id' column to 'doctors' table...")
            conn.execute(text("ALTER TABLE doctors ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            conn.commit()
            print("Successfully updated database schema.")
        else:
            print("'user_id' already exists in 'doctors' table.")

if __name__ == "__main__":
    try:
        sync_schema()
    except Exception as e:
        print(f"Error syncing schema: {e}")
