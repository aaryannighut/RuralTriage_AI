from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# 1. Retrieve DATABASE_URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Environment Detection (Railway vs Local)
IS_RAILWAY = os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_STATIC_URL")

if IS_RAILWAY:
    # PRODUCTION (Railway) - Strict PostgreSQL enforcement
    if not DATABASE_URL or "sqlite" in DATABASE_URL.lower():
        error_msg = (
            "PRODUCTION ERROR: DATABASE_URL is missing or set to SQLite on Railway.\n"
            "Go to Railway -> Project -> Backend -> Variables and add:\n"
            "DATABASE_URL = ${{Postgres.DATABASE_URL}}"
        )
        print(error_msg)
        raise ValueError(error_msg)
    
    # Protocol fix for SQLAlchemy 1.4+
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    engine_args = {"pool_pre_ping": True}
else:
    # LOCAL DEVELOPMENT - Flexibility for SQLite
    if not DATABASE_URL:
        DATABASE_URL = "sqlite:///./ruraltriage.db"
        print(f"Local Dev: No DATABASE_URL found. Defaulting to: {DATABASE_URL}")
    else:
        print(f"Local Dev: Using environment-provided URL: {DATABASE_URL}")
    
    engine_args = {}
    if "sqlite" in DATABASE_URL.lower():
        # SQLite requires this for multi-threaded FastAPI access
        engine_args["connect_args"] = {"check_same_thread": False}

# 3. Debug print
print(f"Database Connection: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")

# 4. Configure SQLAlchemy engine
engine = create_engine(DATABASE_URL, **engine_args)

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