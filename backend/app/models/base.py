from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer, Boolean, text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.session import Base
from app.utils.logging import logger


class TimestampMixin:
    """
    Mixin class to automatically append created_at and updated_at 
    audit timestamps to our fintech database tables.
    """
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow, 
        nullable=False, 
        server_default=text("CURRENT_TIMESTAMP")
    )

class ReconciliationSession(Base, TimestampMixin):
    __tablename__ = "reconciliation_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_name = Column(String(100), nullable=False)
    status = Column(String(50), default="INIT", nullable=False)  # INIT, PARSING, MATCHING, COMPLETED, FAILED
    bank_file_name = Column(String(255), nullable=True)
    ledger_file_name = Column(String(255), nullable=True)
    
    # Session summary indicators
    total_bank_records = Column(Integer, default=0)
    total_ledger_records = Column(Integer, default=0)
    matched_records = Column(Integer, default=0)
    mismatched_records = Column(Integer, default=0)

    # Relationships
    transactions = relationship("Transaction", back_populates="session", cascade="all, delete-orphan")
    matches = relationship("ReconciliationResult", back_populates="session", cascade="all, delete-orphan")

class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("reconciliation_sessions.id", ondelete="CASCADE"), nullable=False)
    
    # Origin dataset mapping (bank vs system ledger)
    source_type = Column(String(50), nullable=False)  # BANK_STATEMENT, EXTERNAL_LEDGER
    
    # Normalized transaction fields
    transaction_date = Column(DateTime, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    reference = Column(String(100), nullable=True, index=True)
    description = Column(String(255), nullable=True)
    
    # Internal status tracking
    matching_status = Column(String(50), default="UNRECONCILED", nullable=False)  # UNRECONCILED, RECONCILED, MANUAL_REVIEW

    # Relationships
    session = relationship("ReconciliationSession", back_populates="transactions")

class ReconciliationResult(Base, TimestampMixin):
    __tablename__ = "reconciliation_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("reconciliation_sessions.id", ondelete="CASCADE"), nullable=False)
    
    # Matching details (linked transaction keys)
    bank_transaction_id = Column(String(36), ForeignKey("transactions.id"), nullable=True)
    ledger_transaction_id = Column(String(36), ForeignKey("transactions.id"), nullable=True)
    
    # Match diagnostics
    match_score = Column(Integer, default=0, nullable=False)  # 0 to 100 percentage quality
    match_type = Column(String(50), nullable=False)  # EXACT, FUZZY, TEMPORAL_OFFSET, UNMATCHED_BANK, UNMATCHED_LEDGER
    manual_override = Column(Boolean, default=False, nullable=False)
    flagged_for_review = Column(Boolean, default=False, nullable=False)
    comments = Column(String(255), nullable=True)

    # Relationships
    session = relationship("ReconciliationSession", back_populates="matches")
    bank_transaction = relationship("Transaction", foreign_keys=[bank_transaction_id])
    ledger_transaction = relationship("Transaction", foreign_keys=[ledger_transaction_id])
    
# Import utility to initialize all tables in db connection
def init_db(engine_obj) -> None:
    """
    Synthesizes and creates the database schema using Base models.
    """
    logger.info("Generating and compiling database schemas in target connection...")
    Base.metadata.create_all(bind=engine_obj)
    logger.info("Database base tables compiled successfully.")
