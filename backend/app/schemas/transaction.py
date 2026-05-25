from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

# --- Core base fields ---
class TimestampSchema(BaseModel):
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# --- Reconciliation Session schemas ---
class SessionBase(BaseModel):
    session_name: str = Field(..., max_length=100, examples=["May Payoneer Reconciliation"])
    bank_file_name: Optional[str] = None
    ledger_file_name: Optional[str] = None

class SessionCreate(SessionBase):
    pass

class SessionResponse(SessionBase, TimestampSchema):
    id: str
    status: str
    total_bank_records: int
    total_ledger_records: int
    matched_records: int
    mismatched_records: int

# --- Transaction schemas ---
class TransactionBase(BaseModel):
    source_type: str = Field(..., description="BANK_STATEMENT or EXTERNAL_LEDGER")
    transaction_date: datetime
    amount: float = Field(..., description="Transactional value (positive for deposits, negative for charges)")
    currency: str = Field(default="USD", max_length=10)
    reference: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=255)

class TransactionCreate(TransactionBase):
    session_id: str

class TransactionResponse(TransactionBase, TimestampSchema):
    id: str
    session_id: str
    matching_status: str

# --- Reconciliation Result match schemas ---
class ReconciliationResultResponse(TimestampSchema):
    id: str
    session_id: str
    bank_transaction_id: Optional[str] = None
    ledger_transaction_id: Optional[str] = None
    match_score: int
    match_type: str
    manual_override: bool
    flagged_for_review: bool
    comments: Optional[str] = None
