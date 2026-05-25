from sqlalchemy.orm import Session
from app.models.base import ReconciliationSession, Transaction, ReconciliationResult
from app.services.duplicate_detection_service import DuplicateDetectionService
from app.services.matching_service import MatchingService
from app.services.reconciliation_summary_service import ReconciliationSummaryService
from app.schemas.reconciliation import RunReconciliationResponse, ReconciliationSummarySchema
from app.utils.logging import logger
from fastapi import HTTPException
from typing import List

class ReconciliationService:
    @staticmethod
    def run_reconciliation(session_id: str, db: Session) -> RunReconciliationResponse:
        """
        Coordinates the complete matching cycle:
        1. Fetch session and check active status
        2. Load transactions
        3. Detect duplicates
        4. Run rule-based matching engine
        5. Persist results
        6. Update session state
        """
        logger.info(f"Initiating matching orchestration for session {session_id}...")

        # 1. Fetch reconciliation session
        session = db.query(ReconciliationSession).filter(ReconciliationSession.id == session_id).first()
        if not session:
            logger.error(f"Reconciliation session {session_id} not found in database.")
            raise HTTPException(status_code=404, detail="Reconciliation session not found")

        # 2. Load all transactions linked to this session
        all_txs = db.query(Transaction).filter(Transaction.session_id == session_id).all()
        if not all_txs:
            logger.error(f"No transactions found for session {session_id}.")
            raise HTTPException(
                status_code=400,
                detail="No transactions uploaded yet for this session. Please perform file upload first."
            )

        bank_txs = [t for t in all_txs if t.source_type == "BANK_STATEMENT"]
        external_txs = [t for t in all_txs if t.source_type == "EXTERNAL_LEDGER"]

        # 3. Detect duplicates within datasets
        bank_dup_ids, updated_bank = DuplicateDetectionService.detect_duplicates(bank_txs)
        external_dup_ids, updated_external = DuplicateDetectionService.detect_duplicates(external_txs)

        # Merge duplicate IDs
        duplicate_ids = bank_dup_ids.union(external_dup_ids)

        # 4. Run deterministic matching funnel
        results = MatchingService.run_matching(session_id, bank_txs, external_txs, duplicate_ids)

        # 5. Persist results to DB
        try:
            # Delete old matching results to allow clean re-runs
            db.query(ReconciliationResult).filter(ReconciliationResult.session_id == session_id).delete()

            # Add new results
            for res in results:
                # Ensure relationships can resolve cleanly in SQLAlchemy
                db.add(res)

            # 6. Update transaction matching status
            for tx in all_txs:
                db.add(tx)

            # 7. Calculate summary metrics
            summary = ReconciliationSummaryService.calculate_summary(bank_txs, external_txs, results)

            # 8. Update main session record
            session.status = "COMPLETED"
            session.total_bank_records = len(bank_txs)
            session.total_ledger_records = len(external_txs)
            session.matched_records = summary.matched_count
            session.mismatched_records = summary.mismatch_count
            db.add(session)

            db.commit()
            logger.info(f"Session {session_id} successfully reconciled and saved.")

            return RunReconciliationResponse(
                session_id=session_id,
                status="COMPLETED",
                summary=summary
            )

        except Exception as e:
            db.rollback()
            logger.error(f"Failed committing reconciliation session results: {str(e)}")
            session.status = "FAILED"
            db.add(session)
            db.commit()
            raise HTTPException(status_code=500, detail=f"Reconciliation engine failed: {str(e)}")

    @staticmethod
    def get_results(session_id: str, db: Session) -> List[ReconciliationResult]:
        """
        Retrieves matching results for a specific session ID, joining transaction tables
        to include full canonical descriptions, reference codes, dates, and amounts.
        """
        return db.query(ReconciliationResult).filter(
            ReconciliationResult.session_id == session_id
        ).all()

    @staticmethod
    def get_summary(session_id: str, db: Session) -> ReconciliationSummarySchema:
        """
        Loads transactions and results for a session, and re-calculates the aggregate summary.
        """
        all_txs = db.query(Transaction).filter(Transaction.session_id == session_id).all()
        bank_txs = [t for t in all_txs if t.source_type == "BANK_STATEMENT"]
        external_txs = [t for t in all_txs if t.source_type == "EXTERNAL_LEDGER"]
        results = db.query(ReconciliationResult).filter(ReconciliationResult.session_id == session_id).all()

        return ReconciliationSummaryService.calculate_summary(bank_txs, external_txs, results)
