"""
Migration script — drops old tables and creates new ones matching the redesigned models.
Run once: python migrate.py
"""
from sqlalchemy import text
from app.database import engine
from app.models import Base  # noqa: F401 — imports all models so metadata is populated

with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS patients CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS doctors  CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS pharmacy CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS pharmacies CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS users    CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS medicines CASCADE"))
    conn.commit()
    print("Old tables dropped.")

Base.metadata.create_all(bind=engine)
print("New tables created:")
for table in sorted(Base.metadata.tables):
    print(f"  ✓ {table}")
