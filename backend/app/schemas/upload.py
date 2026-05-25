from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict

# --- Standard Envelope Schema ---
class StandardResponse(BaseModel):
    success: bool = Field(..., description="API operational execution success status")
    message: str = Field(..., description="Informational message about the transaction")
    data: Optional[Any] = Field(default=None, description="Typesafe payload dictionary")
    errors: List[str] = Field(default=[], description="Errors logs if validation or operations failed")

# --- Upload Payload Details ---
class UploadDataResponse(BaseModel):
    session_id: str = Field(..., description="UUID4 session mapping ID")
    filename: str = Field(..., description="Original name of the uploaded document")
    file_path: str = Field(..., description="Absolute cache path on local server disk")
    file_type: str = Field(..., description="Document purpose: BANK_STATEMENT or EXTERNAL_LEDGER")
    file_size_kb: float = Field(..., description="Size of uploaded document in Kilobytes")

# --- Preview Columns and Stats ---
class PreviewDataResponse(BaseModel):
    session_id: str
    file_type: str
    filename: str
    total_records: int
    detected_columns: List[str]
    mapped_columns: Dict[str, str]
    preview_rows: List[Dict[str, Any]]
    metrics: Dict[str, Any]  # e.g., total deposits, total withdrawals, null counts
