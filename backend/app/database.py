from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Fetch DATABASE_URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

# Debugging: Print masked DATABASE_URL at startup as requested
if DATABASE_URL:
    try:
        # Mask the password in the connection string for security
        if "://" in DATABASE_URL:
            protocol, rest = DATABASE_URL.split("://", 1)
            if "@" in rest:
                user_info, host_info = rest.split("@", 1)
                masked_user = user_info.split(":")[0] + ":****" if ":" in user_info else "****"
                print(f"📡 Database Connection: {protocol}://{masked_user}@{host_info}")
            else:
                print(f"📡 Database Connection: {protocol}://{rest}")
        else:
            print("📡 Database Connection: [Malfomed URL found]")
    except Exception:
        print("📡 Database Connection: [Found, but could not mask metadata]")
else:
    print("📡 Database Connection: [NOT FOUND]")

# Strict Production Check: Refuse SQLite
if not DATABASE_URL or "sqlite" in DATABASE_URL.lower():
    raise ValueError(
        "CRITICAL ERROR: DATABASE_URL is missing or set to SQLite. "
        "Railway deployments require a valid PostgreSQL connection string."
    )

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