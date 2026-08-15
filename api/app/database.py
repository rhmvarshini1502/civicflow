from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(
        settings.DATABASE_URL, connect_args=connect_args
    )
    with engine.connect() as conn:
        pass
except Exception:
    # Fallback to in-memory SQLite if filesystem write fails on serverless container
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    FastAPI dependency that provides a thread-local database session and closes it after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
