from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool
from typing import Generator
from app.core.config import settings
from app.utils.logging import logger

# Configure connection arguments for SQLite compatibility (thread-safety checks bypass)
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    # If in-memory database is specified, use static pool
    if ":memory:" in settings.DATABASE_URL:
        connect_args["poolclass"] = StaticPool

# Initialize Database Engine
logger.info(f"Initializing database engine connected to: {settings.DATABASE_URL}")
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False  # Set to True to log raw SQL queries during debug cycles
)

# Thread-local session maker
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Declarative base class for models
Base = declarative_base()

def get_db() -> Generator:
    """
    FastAPI dependency that provides a transactional database session.
    Automatically closes the session once the API request lifecycle ends.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
