from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# 1. Retrieve DATABASE_URL from environment variables ONLY
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Debug print (EXACTLY as requested for Railway log debugging)
print("DATABASE_URL =", DATABASE_URL)

# 3. Validation: Fail loudly and immediately if missing or set to SQLite
if not DATABASE_URL or "sqlite" in DATABASE_URL.lower():
    raise ValueError("DATABASE_URL is missing or set to SQLite. Ensure it is set in Railway Variables.")

# 4. Railway Compatibility: replace "postgres://" with "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 5. Configure SQLAlchemy engine using DATABASE_URL only
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()