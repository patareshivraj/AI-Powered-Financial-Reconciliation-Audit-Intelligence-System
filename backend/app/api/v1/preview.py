from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import os
import glob
import pandas as pd
import numpy as np
from app.db.session import get_db
from app.core.config import settings
from app.services.parser_service import ParserService
from app.services.normalizer_service import NormalizerService
from app.schemas.upload import StandardResponse
from app.models.base import ReconciliationSession
from app.utils.logging import logger

router = APIRouter()

def find_session_file(session_dir: str, file_pattern: str) -> Optional[str]:
    """
    Scans session folder for files matching prefix bank_statement or external_transactions.
    """
    matches = glob.glob(os.path.join(session_dir, f"{file_pattern}.*"))
    return matches[0] if matches else None

def compile_dataset_preview(file_path: str, source_type: str) -> Dict[str, Any]:
    """
    Helper to parse, normalize, and extract preview data/metrics from a spreadsheet.
    """
    filename = os.path.basename(file_path)
    
    # 1. Execute Safe Parser
    raw_df = ParserService.parse_file(file_path)
    total_records = len(raw_df)
    
    # Get raw column headers
    raw_columns = raw_df.columns.tolist()
    
    # 2. Get dynamic header mapping dict
    mapped_columns = NormalizerService._map_headers(raw_columns)
    
    # 3. Execute Normalization Pipeline
    normalized_df = NormalizerService.normalize_dataframe(raw_df, source_type)
    
    # 4. Generate first 10 rows sample as dictionary objects
    # Handle NaN values to prevent JSON serialization errors
    preview_df = normalized_df.head(10).replace({np.nan: None})
    preview_rows = preview_df.to_dict(orient="records")
    
    # 5. Extract basic metrics summaries
    amounts = normalized_df["amount"].fillna(0.0)
    deposits = float(amounts[amounts > 0].sum())
    withdrawals = float(amounts[amounts < 0].sum())
    
    metrics = {
        "deposits_count": int((amounts > 0).sum()),
        "withdrawals_count": int((amounts < 0).sum()),
        "total_deposits_volume": round(deposits, 2),
        "total_withdrawals_volume": round(abs(withdrawals), 2),
        "missing_references": int(normalized_df["reference_id"].isna().sum())
    }
    
    return {
        "filename": filename,
        "total_records": total_records,
        "detected_columns": raw_columns,
        "mapped_columns": mapped_columns,
        "preview_rows": preview_rows,
        "metrics": metrics
    }

@router.get("/{session_id}", response_model=StandardResponse, status_code=status.HTTP_200_OK)
def get_session_preview(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves preview metadata and samples for both statement and ledger under a session.
    """
    logger.info(f"Generating live dataset preview for session ID: {session_id}")
    
    # 1. Verify session folder integrity
    session_dir = os.path.abspath(os.path.join(settings.UPLOAD_DIR, session_id))
    if not os.path.exists(session_dir):
        logger.warning(f"Preview requested for missing sandbox: {session_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session uploads directory not found."
        )

    # 2. Locate statement and ledger files
    bank_path = find_session_file(session_dir, "bank_statement")
    ledger_path = find_session_file(session_dir, "external_transactions")

    if not bank_path and not ledger_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No files uploaded in this session yet."
        )

    preview_payload = {}
    errors = []

    # 3. Parse bank statement if present
    if bank_path:
        try:
            logger.info("Compiling bank statement preview...")
            preview_payload["bank_statement"] = compile_dataset_preview(bank_path, "BANK_STATEMENT")
        except Exception as e:
            logger.error(f"Failed parsing bank statement preview: {e}")
            errors.append(f"Bank Statement Parse Error: {str(e)}")

    # 4. Parse external ledger if present
    if ledger_path:
        try:
            logger.info("Compiling external ledger preview...")
            preview_payload["external_ledger"] = compile_dataset_preview(ledger_path, "EXTERNAL_LEDGER")
        except Exception as e:
            logger.error(f"Failed parsing external ledger preview: {e}")
            errors.append(f"External Ledger Parse Error: {str(e)}")

    # 5. Dynamic DB counts update (to synchronize session stats in list endpoints)
    session_record = db.query(ReconciliationSession).filter(ReconciliationSession.id == session_id).first()
    if session_record:
        if "bank_statement" in preview_payload:
            session_record.total_bank_records = preview_payload["bank_statement"]["total_records"]
        if "external_ledger" in preview_payload:
            session_record.total_ledger_records = preview_payload["external_ledger"]["total_records"]
        session_record.status = "PARSED"
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed syncing database counts: {e}")

    return StandardResponse(
        success=len(preview_payload) > 0,
        message="Session dataset preview compiled successfully.",
        data=preview_payload,
        errors=errors
    )
