"""
Test fixtures: in-memory SQLite session, sample transactions, and reconciliation results.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.session import Base
from app.models.base import ReconciliationSession, Transaction, ReconciliationResult
from datetime import datetime
import uuid


@pytest.fixture
def db():
    """Provides a clean in-memory SQLite session for each test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def sample_session(db):
    """Creates a reconciliation session with bank and ledger transactions."""
    sid = str(uuid.uuid4())
    s = ReconciliationSession(id=sid, session_name="test-session", status="COMPLETED")
    db.add(s)

    # Bank transactions
    b1 = Transaction(id="b1", session_id=sid, source_type="BANK_STATEMENT",
                     transaction_date=datetime(2026, 5, 1), amount=1000.0,
                     reference="UTR12345", description="Payment to Vendor A")
    b2 = Transaction(id="b2", session_id=sid, source_type="BANK_STATEMENT",
                     transaction_date=datetime(2026, 5, 2), amount=2500.0,
                     reference="UTR67890", description="Payment to Vendor B")
    b3 = Transaction(id="b3", session_id=sid, source_type="BANK_STATEMENT",
                     transaction_date=datetime(2026, 5, 3), amount=75000.0,
                     reference="DUP001", description="Duplicate large payment")

    # Ledger transactions
    l1 = Transaction(id="l1", session_id=sid, source_type="EXTERNAL_LEDGER",
                     transaction_date=datetime(2026, 5, 1), amount=1000.0,
                     reference="UTR12345", description="Vendor A receipt")
    l2 = Transaction(id="l2", session_id=sid, source_type="EXTERNAL_LEDGER",
                     transaction_date=datetime(2026, 5, 2), amount=2000.0,
                     reference="UTR67890", description="Vendor B receipt")
    l3 = Transaction(id="l3", session_id=sid, source_type="EXTERNAL_LEDGER",
                     transaction_date=datetime(2026, 5, 3), amount=75000.0,
                     reference="DUP001", description="Duplicate large payment copy")

    db.add_all([b1, b2, b3, l1, l2, l3])

    # Results
    r1 = ReconciliationResult(id="r1", session_id=sid, bank_transaction_id="b1",
                              ledger_transaction_id="l1", match_type="MATCHED", match_score=100)
    r2 = ReconciliationResult(id="r2", session_id=sid, bank_transaction_id="b2",
                              ledger_transaction_id="l2", match_type="AMOUNT_MISMATCH", match_score=60)
    r3 = ReconciliationResult(id="r3", session_id=sid, bank_transaction_id="b3",
                              ledger_transaction_id="l3", match_type="DUPLICATE", match_score=95)

    db.add_all([r1, r2, r3])
    db.commit()

    return sid


@pytest.fixture
def fuzzy_session(db):
    """Session with orphan records suited for fuzzy matching tests."""
    sid = str(uuid.uuid4())
    s = ReconciliationSession(id=sid, session_name="fuzzy-test", status="COMPLETED")
    db.add(s)

    # Bank orphan (missing in external)
    b1 = Transaction(id="fb1", session_id=sid, source_type="BANK_STATEMENT",
                     transaction_date=datetime(2026, 5, 1), amount=500.0,
                     reference="UTR-12345", description="Bank pay")

    # Ledger orphan (missing in bank)
    l1 = Transaction(id="fl1", session_id=sid, source_type="EXTERNAL_LEDGER",
                     transaction_date=datetime(2026, 5, 1), amount=500.0,
                     reference="UTR12345", description="Ledger pay")

    db.add_all([b1, l1])

    r1 = ReconciliationResult(id="fr1", session_id=sid, bank_transaction_id="fb1",
                              ledger_transaction_id=None, match_type="MISSING_IN_EXTERNAL", match_score=0)
    r2 = ReconciliationResult(id="fr2", session_id=sid, bank_transaction_id=None,
                              ledger_transaction_id="fl1", match_type="MISSING_IN_BANK", match_score=0)

    db.add_all([r1, r2])
    db.commit()
    return sid
