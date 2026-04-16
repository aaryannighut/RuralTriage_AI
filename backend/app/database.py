from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Fetch DATABASE_URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

# Production safety: Fail early if DATABASE_URL is missing
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing. Please set the DATABASE_URL environment variable.")

# Railway/Heroku fix: replace postgres:// with postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

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