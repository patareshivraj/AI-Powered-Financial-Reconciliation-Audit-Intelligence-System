from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class TransactionRepresentation(BaseModel):
    id: str
    session_id: str
    source_type: str  # BANK_STATEMENT, EXTERNAL_LEDGER
    transaction_date: datetime
    amount: float
    currency: str
    reference: Optional[str] = None
    description: Optional[str] = None
    matching_status: str

    class Config:
        from_attributes = True

class ReconciliationResultSchema(BaseModel):
    id: str
    session_id: str
    bank_transaction_id: Optional[str] = None
    ledger_transaction_id: Optional[str] = None
    status: str  # MATCHED, PARTIAL_MATCH, AMOUNT_MISMATCH, DATE_MISMATCH, MISSING_IN_BANK, MISSING_IN_EXTERNAL, DUPLICATE
    match_score: int
    remarks: Optional[str] = None
    bank_transaction: Optional[TransactionRepresentation] = None
    ledger_transaction: Optional[TransactionRepresentation] = None

    class Config:
        from_attributes = True

class ReconciliationSummarySchema(BaseModel):
    total_bank_transactions: int
    total_external_transactions: int
    matched_count: int
    mismatch_count: int
    unmatched_count: int
    duplicate_count: int
    matched_amount: float
    unmatched_amount: float

    class Config:
        from_attributes = True

class RunReconciliationResponse(BaseModel):
    session_id: str
    status: str
    summary: ReconciliationSummarySchema

    class Config:
        from_attributes = True
