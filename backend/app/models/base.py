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

class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    sessions = relationship("ReconciliationSession", back_populates="organization", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="organization", cascade="all, delete-orphan")

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(String(50), default="ANALYST", nullable=False)  # ADMIN, ANALYST, AUDITOR
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="actor")

class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g., UPLOAD_FILE, RUN_RECONCILIATION, AI_QUERY
    entity_type = Column(String(50), nullable=True) # e.g., SESSION, TRANSACTION, USER
    entity_id = Column(String(36), nullable=True)
    metadata_json = Column(String(1000), nullable=True) # stringified json metadata

    # Relationships
    organization = relationship("Organization", back_populates="audit_logs")
    actor = relationship("User", back_populates="audit_logs")

class ReconciliationSession(Base, TimestampMixin):
    __tablename__ = "reconciliation_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True) # Nullable for backward compatibility during migration, should be enforced later
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
    organization = relationship("Organization", back_populates="sessions")
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
