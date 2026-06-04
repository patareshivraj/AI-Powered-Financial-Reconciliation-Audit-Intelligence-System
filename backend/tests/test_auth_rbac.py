import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid

from main import app
from app.db.session import get_db, Base
from app.models.base import Organization, User, AuditLog
from app.core.auth import get_password_hash

# 1. Setup in-memory test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_auth.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Mock SessionLocal for background tasks
import app.api.v1.reconciliation as recon_module
recon_module.SessionLocal = TestingSessionLocal

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create Organization
    org = Organization(id=str(uuid.uuid4()), name="Test Org")
    db.add(org)
    
    # Create Admin
    admin = User(
        email="admin@test.local", 
        hashed_password=get_password_hash("testpass"), 
        role="ADMIN", 
        organization_id=org.id
    )
    # Create Analyst
    analyst = User(
        email="analyst@test.local", 
        hashed_password=get_password_hash("testpass"), 
        role="ANALYST", 
        organization_id=org.id
    )
    # Create Auditor
    auditor = User(
        email="auditor@test.local", 
        hashed_password=get_password_hash("testpass"), 
        role="AUDITOR", 
        organization_id=org.id
    )
    
    db.add_all([admin, analyst, auditor])
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

def get_token(email: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "testpass"}
    )
    return response.json()["access_token"]


# ==========================================
# 1. AUTHENTICATION FLOW TESTS
# ==========================================
def test_valid_login():
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin@test.local", "password": "testpass"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["role"] == "ADMIN"

def test_invalid_login():
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin@test.local", "password": "wrongpassword"}
    )
    assert response.status_code == 401


# ==========================================
# 2. RBAC & ROUTE PROTECTION TESTS
# ==========================================
def test_protected_api_without_token():
    # Attempting to fetch reconciliation results without token
    response = client.get("/api/v1/reconciliation/results/dummy-session-id")
    assert response.status_code == 401

def test_admin_access():
    token = get_token("admin@test.local")
    # Admin should be able to run reconciliation
    response = client.post(
        "/api/v1/reconciliation/run/dummy-session-id",
        headers={"Authorization": f"Bearer {token}"}
    )
    # 200 because it queues the background task
    assert response.status_code == 200

def test_analyst_restrictions():
    token = get_token("analyst@test.local")
    # Analyst should NOT be able to run hard reconciliation (Requires Admin)
    response = client.post(
        "/api/v1/reconciliation/run/dummy-session-id",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403

def test_auditor_restrictions():
    token = get_token("auditor@test.local")
    # Auditor should NOT be able to use AI Assistant
    response = client.post(
        "/api/v1/ai-assistant/chat/dummy-session",
        json={"query": "hello"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    
    # But Auditor CAN download exports
    response = client.get(
        "/api/v1/reports/investigation/dummy-session?format=csv",
        headers={"Authorization": f"Bearer {token}"}
    )
    # Might be 404/500 if session doesn't exist, but NOT 403 Forbidden
    assert response.status_code != 403


# ==========================================
# 3. AUDIT LOGGING TESTS
# ==========================================
def test_audit_logs_created_for_reconciliation(monkeypatch):
    db = TestingSessionLocal()
    token = get_token("admin@test.local")
    session_id = str(uuid.uuid4())
    
    # Create the session so the service doesn't 404
    from app.models.base import ReconciliationSession
    session_record = ReconciliationSession(id=session_id, session_name="Test Session")
    db.add(session_record)
    db.commit()
    
    # Mock the actual run_reconciliation so it doesn't fail due to missing transactions
    from app.services.reconciliation_service import ReconciliationService
    monkeypatch.setattr(ReconciliationService, "run_reconciliation", lambda *args, **kwargs: None)
    
    # Trigger action
    client.post(
        f"/api/v1/reconciliation/run/{session_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Give the background task a tiny moment to commit the audit log
    import time
    time.sleep(1)
    
    # Check Audit Log table
    log = db.query(AuditLog).filter(AuditLog.action == "RUN_RECONCILIATION").first()
    assert log is not None
    assert log.entity_id == session_id
    db.close()
