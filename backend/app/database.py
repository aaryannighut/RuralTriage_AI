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

# Configure engine arguments based on the database type
engine_args = {"pool_pre_ping": True}

if DATABASE_URL.startswith("sqlite"):
    # SQLite requires check_same_thread=False for FastAPI/multi-threaded use
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL specific settings for production
    engine_args["pool_size"] = 10
    engine_args["max_overflow"] = 20

engine = create_engine(DATABASE_URL, **engine_args)

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