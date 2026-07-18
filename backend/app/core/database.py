import os
from sqlmodel import SQLModel, create_engine, Session
from pathlib import Path

# Save db in the workspace directory under backend
DB_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = DB_DIR / "okc_library.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} # Required for SQLite multi-thread access in FastAPI
)

def init_db():
    """
    Creates tables if they do not exist.
    """
    SQLModel.metadata.create_all(engine)

def get_session():
    """
    FastAPI dependency for database sessions.
    """
    with Session(engine) as session:
        yield session
