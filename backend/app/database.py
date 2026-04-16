import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.settings import Settings

_settings = Settings()

# Priority 1: DATABASE_URL from environment (Railway)
DATABASE_URL = _settings.DATABASE_URL

# Fix for Railway/Heroku: Replace 'postgres://' with 'postgresql://' as required by SQLAlchemy 1.4+
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Ensure DATABASE_URL is present
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is missing!")

# Production Engine Configuration
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Ensures stale connections are recycled
    pool_size=10,        # Production level pooling
    max_overflow=20
)

SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

Base = declarative_base()

# FastAPI dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()