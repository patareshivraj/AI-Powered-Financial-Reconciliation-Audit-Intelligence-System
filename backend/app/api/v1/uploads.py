from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import os
from app.db.session import get_db
from app.services.upload_service import UploadService
from app.schemas.upload import StandardResponse, UploadDataResponse
from app.models.base import ReconciliationSession, User
from app.core.auth import require_analyst_or_admin
from app.utils.logging import logger

router = APIRouter()

def sync_session_record(
    db: Session,
    session_id: str,
    filename: str,
    file_type: str,
    user: User
) -> ReconciliationSession:
    """
    Looks up or initializes a ReconciliationSession record in the database.
    Updates filename and resets status code to INIT/PARSING.
    """
    session_record = db.query(ReconciliationSession).filter(ReconciliationSession.id == session_id).first()
    
    if not session_record:
        logger.info(f"Registering brand new session record {session_id} in SQLite...")
        session_record = ReconciliationSession(
            id=session_id,
            session_name=f"Session — {session_id[:8].upper()}",
            status="INIT",
            organization_id=user.organization_id
        )
        db.add(session_record)
        
    # Bind filename
    if file_type == "BANK_STATEMENT":
        session_record.bank_file_name = filename
    else:
        session_record.ledger_file_name = filename
        
    session_record.status = "INIT"  # Ready to be parsed and normalized
    
    try:
        db.commit()
        db.refresh(session_record)
        return session_record
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to sync database session states: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database session sync failure: {e}"
        )

@router.post("/bank-statement", response_model=StandardResponse, status_code=status.HTTP_200_OK)
async def upload_bank_statement(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_admin)
):
    """
    Endpoint for uploading a bank statement.
    Validates file and standardizes filename to bank_statement.{ext} inside sandbox.
    """
    logger.info("Multipart bank statement upload request received.")
    try:
        # 1. Persist to isolated folder
        resolved_session_id, saved_path = UploadService.persist_upload(
            file=file,
            file_type="BANK_STATEMENT",
            session_id=session_id
        )
        
        # 2. Track in database
        sync_session_record(db, resolved_session_id, file.filename, "BANK_STATEMENT", user)
        
        file_size_kb = os.path.getsize(saved_path) / 1024.0
        
        response_payload = UploadDataResponse(
            session_id=resolved_session_id,
            filename=file.filename,
            file_path=saved_path,
            file_type="BANK_STATEMENT",
            file_size_kb=file_size_kb
        )
        
        return StandardResponse(
            success=True,
            message="Bank statement uploaded and registered successfully.",
            data=response_payload.dict(),
            errors=[]
        )
        
    except HTTPException as he:
        return StandardResponse(success=False, message="Upload validation failed.", data=None, errors=[he.detail])
    except Exception as e:
        logger.error(f"Unexpected upload crash: {e}", exc_info=True)
        return StandardResponse(
            success=False,
            message="An unexpected server error occurred during statement processing.",
            data=None,
            errors=[str(e)]
        )

@router.post("/external-transactions", response_model=StandardResponse, status_code=status.HTTP_200_OK)
async def upload_external_transactions(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst_or_admin)
):
    """
    Endpoint for uploading an external ledger/ERP/payment gateway transaction file.
    Validates file and standardizes filename to external_transactions.{ext} inside sandbox.
    """
    logger.info("Multipart external transactions upload request received.")
    try:
        # 1. Persist to isolated folder
        resolved_session_id, saved_path = UploadService.persist_upload(
            file=file,
            file_type="EXTERNAL_LEDGER",
            session_id=session_id
        )
        
        # 2. Track in database
        sync_session_record(db, resolved_session_id, file.filename, "EXTERNAL_LEDGER", user)
        
        file_size_kb = os.path.getsize(saved_path) / 1024.0
        
        response_payload = UploadDataResponse(
            session_id=resolved_session_id,
            filename=file.filename,
            file_path=saved_path,
            file_type="EXTERNAL_LEDGER",
            file_size_kb=file_size_kb
        )
        
        return StandardResponse(
            success=True,
            message="External transactions ledger uploaded and registered successfully.",
            data=response_payload.dict(),
            errors=[]
        )
        
    except HTTPException as he:
        return StandardResponse(success=False, message="Upload validation failed.", data=None, errors=[he.detail])
    except Exception as e:
        logger.error(f"Unexpected upload crash: {e}", exc_info=True)
        return StandardResponse(
            success=False,
            message="An unexpected server error occurred during ledger processing.",
            data=None,
            errors=[str(e)]
        )
