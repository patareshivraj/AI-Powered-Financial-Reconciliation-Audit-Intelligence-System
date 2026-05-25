from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.services.upload import UploadService
from app.schemas.transaction import SessionResponse, SessionCreate
from app.models.base import ReconciliationSession
from app.utils.logging import logger
import os

router = APIRouter()

@router.post("/session", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_reconciliation_session(
    session_data: SessionCreate,
    db: Session = Depends(get_db)
):
    """
    Creates a new transactional reconciliation session in SQLite database.
    """
    logger.info(f"Initializing new reconciliation session record: {session_data.session_name}")
    try:
        new_session = ReconciliationSession(
            session_name=session_data.session_name,
            status="INIT",
            bank_file_name=session_data.bank_file_name,
            ledger_file_name=session_data.ledger_file_name
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        return new_session
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to compile session registry: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record reconciliation session details: {e}"
        )

@router.get("/sessions", response_model=List[SessionResponse])
def list_reconciliation_sessions(
    db: Session = Depends(get_db)
):
    """
    Retrieves all reconciliation sessions logged in the platform history database.
    """
    logger.info("Listing all historical reconciliation audit sessions.")
    return db.query(ReconciliationSession).order_by(ReconciliationSession.created_at.desc()).all()

@router.post("/upload/{session_id}")
def upload_reconciliation_file(
    session_id: str,
    file_type: str = Form(..., description="Type of document: BANK_STATEMENT or EXTERNAL_LEDGER"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Safe file upload handler endpoint.
    Saves document under unique subfolder, validates extension & size, and updates SQLite session metadata.
    """
    # 1. Verify target session exists in DB
    session_record = db.query(ReconciliationSession).filter(ReconciliationSession.id == session_id).first()
    if not session_record:
        logger.warning(f"File upload requested for non-existent session ID: {session_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reconciliation session with ID {session_id} not found."
        )

    # 2. Pipe file to disk using validation-first upload services
    try:
        subfolder = f"session_{session_id}/{file_type.lower()}"
        saved_path = UploadService.save_uploaded_file(file, subfolder=subfolder)
        
        # 3. Update database record with filenames and pipeline stage state
        if file_type.upper() == "BANK_STATEMENT":
            session_record.bank_file_name = file.filename
        else:
            session_record.ledger_file_name = file.filename
            
        session_record.status = "PARSING"
        db.commit()
        db.refresh(session_record)
        
        logger.info(f"Recorded upload file {file.filename} under session {session_id}")
        
        return {
            "status": "success",
            "message": f"Successfully persisted {file_type} to disk.",
            "file_path": saved_path,
            "filename": file.filename
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Database write failed for upload tracking: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bind uploaded file details to session: {e}"
        )
