from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.settings import Settings

_settings = Settings()

db_url = _settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Configure engine arguments based on the database type
engine_args = {"pool_pre_ping": True}

if db_url.startswith("sqlite"):
    # SQLite requires check_same_thread=False for FastAPI/multi-threaded use
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL specific settings for production
    engine_args["pool_size"] = 10
    engine_args["max_overflow"] = 20

engine = create_engine(db_url, **engine_args)

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