import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Fetch DATABASE_URL from environment variables (MANDATORY for Railway)
DATABASE_URL = os.getenv("DATABASE_URL")

# Fix for Railway/Heroku: Replace 'postgres://' with 'postgresql://' as required by SQLAlchemy 1.4+
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Ensure fallback for local development if needed, but production MUST use DATABASE_URL
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./local.db" 

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